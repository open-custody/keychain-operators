import { DirectSecp256k1HdWallet, OfflineSigner } from '@cosmjs/proto-signing';
import { Client } from '@warden/wardenprotocol-client/dist';
import { KeyRequestStatus } from '@warden/wardenprotocol-client/dist/warden.warden.v1beta2/types/warden/warden/v1beta2/key';
import { promisify } from 'util';

import { IWardenConfiguration } from './types/configuration';
import { KeyRequest } from './types/keyRequest';
import { INewKeyRequest } from './types/newKeyRequest';
import { ITransactionState } from './types/transactionState';

const delay = promisify((ms: number, res: () => void) => setTimeout(res, ms));
const keyRetentionMsec = 60_000;

export class WardenService {
  keys: Map<string, number>;

  constructor(private configuration: IWardenConfiguration) {
    this.keys = new Map<string, number>();
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

  async getKeyRequest(requestId: string): Promise<void | KeyRequest> {
    return await this.client()
      .query.queryKeyRequestById({ id: requestId })
      .then((x) => (x?.data?.key_request ? { status: x.data.key_request.status } : null))
      .catch(console.error);
  }
}

export { INewKeyRequest } from './types/newKeyRequest';
