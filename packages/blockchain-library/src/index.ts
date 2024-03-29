import { DirectSecp256k1HdWallet, OfflineSigner } from '@cosmjs/proto-signing';
import { Client } from '@warden/wardenprotocol-client/dist';
import { KeyRequestStatus } from '@warden/wardenprotocol-client/dist/warden.warden.v1beta2/types/warden/warden/v1beta2/key';
import { SignRequestStatus } from '@warden/wardenprotocol-client/dist/warden.warden.v1beta2/types/warden/warden/v1beta2/signature';
import { promisify } from 'util';

import { IWardenConfiguration } from './types/configuration';
import { KeyRequest } from './types/keyRequest';
import { INewKeyRequest } from './types/newKeyRequest';
import { INewSignatureRequest } from './types/newSignatureRequest';
import { SignatureRequest } from './types/signatureRequest';
import { ITransactionState } from './types/transactionState';

const delay = promisify((ms: number, res: () => void) => setTimeout(res, ms));
const keyRetentionMsec = 60_000;

export class WardenService {
  keys: Map<string, number>;
  signatures: Map<string, number>;

  constructor(private configuration: IWardenConfiguration) {
    this.keys = new Map<string, number>();
    this.signatures = new Map<string, number>();
  }

  client(signer: OfflineSigner = undefined) {
    return new Client(this.configuration, signer).WardenWardenV1Beta2;
  }

  async getSigner(): Promise<OfflineSigner> {
    return await DirectSecp256k1HdWallet.fromMnemonic(this.configuration.signerMnemonic, {
      prefix: this.configuration.prefix,
    });
  }

  async *pollPendingKeyRequests(keychainId: string): AsyncGenerator<INewKeyRequest> {
    const query = this.client().query;

    while (this.configuration.pollingIntervalMsec >= 0) {
      await delay(this.configuration.pollingIntervalMsec);

      for (const [key, retiredAt] of this.keys) {
        const nowMsec = new Date().getTime();
        const keyResponse = await this.getKeyRequest(key).catch(console.error);

        if ((!!keyResponse && keyResponse.status !== 'KEY_REQUEST_STATUS_PENDING') || retiredAt < nowMsec) {
          this.keys.delete(key);
        }
      }

      const pendingKeys = await query
        .queryKeyRequests({
          keychain_id: keychainId,
          status: 'KEY_REQUEST_STATUS_PENDING',
          'pagination.limit': '100',
        })
        .catch(console.error);

      if (!pendingKeys || !pendingKeys.data.key_requests) continue;

      for (let i = 0; i < +pendingKeys.data.key_requests.length; i++) {
        const key = pendingKeys.data.key_requests[i];

        if (this.keys.has(key.id)) continue;

        this.keys.set(key.id, new Date().getTime() + keyRetentionMsec);

        yield {
          id: key.id,
          keychainId: key.keychain_id,
          spaceId: key.space_id,
          creator: key.creator,
        };
      }
    }
  }

  async *pollPendingSignatureRequests(keychainId: string): AsyncGenerator<INewSignatureRequest> {
    const query = this.client().query;

    while (this.configuration.pollingIntervalMsec >= 0) {
      await delay(this.configuration.pollingIntervalMsec);

      for (const [key, retiredAt] of this.signatures) {
        const nowMsec = new Date().getTime();
        const keyResponse = await this.getSignatureRequest(key).catch(console.error);

        if ((!!keyResponse && keyResponse.status !== 'SIGN_REQUEST_STATUS_PENDING') || retiredAt < nowMsec) {
          this.signatures.delete(key);
        }
      }

      const pendingKeys = await query
        .querySignatureRequests({
          keychain_id: keychainId,
          status: 'SIGN_REQUEST_STATUS_PENDING',
          'pagination.limit': '100',
        })
        .catch(console.error);

      if (!pendingKeys || !pendingKeys.data.sign_requests) continue;

      for (let i = 0; i < +pendingKeys.data.sign_requests.length; i++) {
        const request = pendingKeys.data.sign_requests[i];

        if (this.signatures.has(request.id)) continue;

        this.signatures.set(request.id, new Date().getTime() + keyRetentionMsec);

        yield {
          id: request.id,
          keyId: request.key_id,
          keychainId: keychainId,
          keyType: request.key_type,
          creator: request.creator,
          signingData: request.data_for_signing,
        };
      }
    }
  }

  async fulfilKeyRequest(requestId: number, publicKey: Buffer): Promise<ITransactionState> {
    const signer = await this.getSigner();
    const accounts = await signer.getAccounts();

    const tx = await this.client(signer).tx.sendMsgUpdateKeyRequest({
      value: {
        creator: accounts[0].address,
        requestId: requestId,
        key: { publicKey: publicKey },
        status: KeyRequestStatus.KEY_REQUEST_STATUS_FULFILLED,
      },
    });

    return { hash: tx.transactionHash, errorCode: tx.code };
  }

  async fulfilSignatureRequest(requestId: number, signedData: Buffer): Promise<ITransactionState> {
    const signer = await this.getSigner();
    const accounts = await signer.getAccounts();

    const tx = await this.client(signer).tx.sendMsgFulfilSignatureRequest({
      value: {
        creator: accounts[0].address,
        requestId: requestId,
        status: SignRequestStatus.SIGN_REQUEST_STATUS_FULFILLED,
        payload: {
          signedData: signedData,
        },
      },
    });

    return { hash: tx.transactionHash, errorCode: tx.code };
  }

  async rejectKeyRequest(requestId: number, reason: string): Promise<ITransactionState> {
    const signer = await this.getSigner();
    const accounts = await signer.getAccounts();

    const tx = await this.client(signer).tx.sendMsgUpdateKeyRequest({
      value: {
        creator: accounts[0].address,
        requestId: requestId,
        status: KeyRequestStatus.KEY_REQUEST_STATUS_REJECTED,
        rejectReason: reason,
      },
    });

    return { hash: tx.transactionHash, errorCode: tx.code };
  }

  async rejectSignatureRequest(requestId: number, reason: string): Promise<ITransactionState> {
    const signer = await this.getSigner();
    const accounts = await signer.getAccounts();

    const tx = await this.client(signer).tx.sendMsgFulfilSignatureRequest({
      value: {
        creator: accounts[0].address,
        requestId: requestId,
        status: SignRequestStatus.SIGN_REQUEST_STATUS_REJECTED,
        rejectReason: reason,
      },
    });

    return { hash: tx.transactionHash, errorCode: tx.code };
  }

  async getKeyRequest(requestId: string): Promise<void | KeyRequest> {
    return await this.client()
      .query.queryKeyRequestById({ id: requestId })
      .then((x) => (x?.data?.key_request ? { status: x.data.key_request.status } : null))
      .catch(console.error);
  }

  async getSignatureRequest(requestId: string): Promise<void | SignatureRequest> {
    return await this.client()
      .query.querySignatureRequestById({ id: requestId })
      .then((x) => (x?.data?.sign_request ? { status: x.data.sign_request.status } : null))
      .catch(console.error);
  }
}

export { INewKeyRequest } from './types/newKeyRequest';
export { INewSignatureRequest } from './types/newSignatureRequest';
