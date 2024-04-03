import { DirectSecp256k1HdWallet, Registry } from '@cosmjs/proto-signing';
import { SigningStargateClient } from '@cosmjs/stargate';
import { delay } from '@warden/utils';
import { cosmosProtoRegistry, warden, wardenProtoRegistry } from '@wardenprotocol/wardjs';
import { KeyRequest, KeyRequestStatus } from '@wardenprotocol/wardjs/dist/codegen/warden/warden/v1beta2/key';
import { SignRequest, SignRequestStatus } from '@wardenprotocol/wardjs/dist/codegen/warden/warden/v1beta2/signature';

import { IWardenConfiguration } from './types/configuration';
import { INewKeyRequest } from './types/newKeyRequest';
import { INewSignatureRequest } from './types/newSignatureRequest';
import { ISigner } from './types/signer';
import { ITransactionState } from './types/transactionState';

const { createRPCQueryClient } = warden.ClientFactory;
const { updateKeyRequest, fulfilSignatureRequest } = warden.warden.v1beta2.MessageComposer.withTypeUrl;

const keyRetentionMsec = 60_000;

export class WardenService {
  keys: Map<bigint, number>;
  signatures: Map<bigint, number>;

  constructor(private configuration: IWardenConfiguration) {
    this.keys = new Map<bigint, number>();
    this.signatures = new Map<bigint, number>();
  }

  async query() {
    return await createRPCQueryClient({ rpcEndpoint: this.configuration.rpcURL });
  }

  async signer(): Promise<ISigner> {
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(this.configuration.signerMnemonic, {
      prefix: this.configuration.prefix,
    });

    const accounts = await wallet.getAccounts();
    const account = accounts[0].address;

    const client = await SigningStargateClient.connectWithSigner(this.configuration.rpcURL, wallet, {
      registry: new Registry([...wardenProtoRegistry, ...cosmosProtoRegistry]),
    });

    return { client, account };
  }

  async *pollPendingKeyRequests(keychainId: bigint): AsyncGenerator<INewKeyRequest> {
    const query = (await this.query()).warden.warden.v1beta2;

    while (this.configuration.pollingIntervalMsec >= 0) {
      await delay(this.configuration.pollingIntervalMsec);

      for (const [id, retiredAt] of this.keys) {
        const now = new Date().getTime();
        const request = await this.getKeyRequest(id).catch(console.error);

        if ((!!request && request.status !== KeyRequestStatus.KEY_REQUEST_STATUS_PENDING) || retiredAt < now) {
          this.keys.delete(id);
        }
      }

      const pendingKeys = await query
        .keyRequests({
          spaceId: 0n,
          keychainId: keychainId,
          status: KeyRequestStatus.KEY_REQUEST_STATUS_PENDING,
          pagination: { limit: 100n, countTotal: false, offset: 0n, reverse: false, key: new Uint8Array() },
        })
        .then((x) => x.keyRequests)
        .catch(console.error);

      if (!pendingKeys || pendingKeys.length === 0) continue;

      for (let i = 0; i < +pendingKeys.length; i++) {
        const key = pendingKeys[i];

        if (this.keys.has(key.id)) continue;

        this.keys.set(key.id, new Date().getTime() + keyRetentionMsec);

        yield {
          id: key.id,
          keychainId: key.keychainId,
          spaceId: key.spaceId,
          creator: key.creator,
        };
      }
    }
  }

  async *pollPendingSignatureRequests(keychainId: bigint): AsyncGenerator<INewSignatureRequest> {
    const query = (await this.query()).warden.warden.v1beta2;

    while (this.configuration.pollingIntervalMsec >= 0) {
      await delay(this.configuration.pollingIntervalMsec);

      for (const [id, retiredAt] of this.signatures) {
        const now = new Date().getTime();
        const request = await this.getSignatureRequest(id).catch(console.error);

        if ((!!request && request.status !== SignRequestStatus.SIGN_REQUEST_STATUS_PENDING) || retiredAt < now) {
          this.signatures.delete(id);
        }
      }

      const pendingSignatures = await query
        .signatureRequests({
          keychainId: keychainId,
          status: SignRequestStatus.SIGN_REQUEST_STATUS_PENDING,
          pagination: { limit: 100n, countTotal: false, offset: 0n, reverse: false, key: new Uint8Array() },
        })
        .then((x) => x.signRequests)
        .catch(console.error);

      if (!pendingSignatures || pendingSignatures.length === 0) continue;

      for (let i = 0; i < +pendingSignatures.length; i++) {
        const request = pendingSignatures[i];

        if (this.signatures.has(request.id)) continue;

        this.signatures.set(request.id, new Date().getTime() + keyRetentionMsec);

        const key = await query
          .keyById({
            id: request.keyId,
            deriveWallets: [],
          })
          .then((x) => x.key)
          .catch(console.error);

        if (!key) continue;

        yield {
          id: request.id,
          publicKey: key.publicKey,
          keychainId: keychainId,
          creator: request.creator,
          signingData: request.dataForSigning,
        };
      }
    }
  }

  async fulfilKeyRequest(requestId: bigint, publicKey: Buffer): Promise<ITransactionState> {
    const signer = await this.signer();

    const message = updateKeyRequest({
      creator: signer.account,
      requestId: requestId,
      key: { publicKey: publicKey },
      status: KeyRequestStatus.KEY_REQUEST_STATUS_FULFILLED,
    });

    const tx = await signer.client.signAndBroadcast(
      signer.account,
      [message],
      {
        gas: '400000',
        amount: [{ denom: 'uward', amount: '500' }],
      },
      '',
    );

    return { hash: tx.transactionHash, errorCode: tx.code };
  }

  async fulfilSignatureRequest(requestId: bigint, signedData: Buffer): Promise<ITransactionState> {
    const signer = await this.signer();

    const message = fulfilSignatureRequest({
      creator: signer.account,
      requestId: requestId,
      status: SignRequestStatus.SIGN_REQUEST_STATUS_FULFILLED,
      payload: {
        signedData: signedData,
      },
    });

    const tx = await signer.client.signAndBroadcast(
      signer.account,
      [message],
      {
        gas: '400000',
        amount: [{ denom: 'uward', amount: '500' }],
      },
      '',
    );

    return { hash: tx.transactionHash, errorCode: tx.code };
  }

  async rejectKeyRequest(requestId: bigint, reason: string): Promise<ITransactionState> {
    const signer = await this.signer();

    const message = updateKeyRequest({
      creator: signer.account,
      requestId: requestId,
      status: KeyRequestStatus.KEY_REQUEST_STATUS_REJECTED,
      rejectReason: reason,
    });

    const tx = await signer.client.signAndBroadcast(
      signer.account,
      [message],
      {
        gas: '400000',
        amount: [{ denom: 'uward', amount: '500' }],
      },
      '',
    );

    return { hash: tx.transactionHash, errorCode: tx.code };
  }

  async rejectSignatureRequest(requestId: bigint, reason: string): Promise<ITransactionState> {
    const signer = await this.signer();

    const message = fulfilSignatureRequest({
      creator: signer.account,
      requestId: requestId,
      status: SignRequestStatus.SIGN_REQUEST_STATUS_REJECTED,
      rejectReason: reason,
    });

    const tx = await signer.client.signAndBroadcast(
      signer.account,
      [message],
      {
        gas: '400000',
        amount: [{ denom: 'uward', amount: '500' }],
      },
      '',
    );

    return { hash: tx.transactionHash, errorCode: tx.code };
  }

  async getKeyRequest(requestId: bigint): Promise<void | KeyRequest> {
    const query = (await this.query()).warden.warden.v1beta2;

    return await query
      .keyRequestById({ id: requestId })
      .then((x) => x.keyRequest)
      .catch(console.error);
  }

  async getSignatureRequest(requestId: bigint): Promise<void | SignRequest> {
    const query = (await this.query()).warden.warden.v1beta2;

    return await query
      .signatureRequestById({ id: requestId })
      .then((x) => x.signRequest)
      .catch(console.error);
  }
}

export { INewKeyRequest } from './types/newKeyRequest';
export { INewSignatureRequest } from './types/newSignatureRequest';
