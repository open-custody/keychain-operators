import { DirectSecp256k1HdWallet, Registry } from '@cosmjs/proto-signing';
import { SigningStargateClient } from '@cosmjs/stargate';
import { delay, logError, logInfo } from '@warden/utils';
import { cosmosProtoRegistry, warden, wardenProtoRegistry } from '@wardenprotocol/wardenjs';
import { PageRequest } from '@wardenprotocol/wardenjs/dist/codegen/cosmos/base/query/v1beta1/pagination';
import { KeyRequest, KeyRequestStatus } from '@wardenprotocol/wardenjs/dist/codegen/warden/warden/v1beta2/key';
import {
  QueryKeyRequestsRequest,
  QuerySignatureRequestsRequest,
} from '@wardenprotocol/wardenjs/dist/codegen/warden/warden/v1beta2/query';
import { SignRequest, SignRequestStatus } from '@wardenprotocol/wardenjs/dist/codegen/warden/warden/v1beta2/signature';
import Long from 'long';

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

    while (true) {
      await delay(this.configuration.pollingIntervalMsec);

      logInfo(`Keys in cache: ${this.keys.size}`);

      for (const [id, retiredAt] of this.keys) {
        const now = new Date().getTime();
        const request = await this.getKeyRequest(id).catch((e) => logError(e));

        if ((!!request && request.status !== KeyRequestStatus.KEY_REQUEST_STATUS_PENDING) || retiredAt < now) {
          this.keys.delete(id);
        }
      }

      const pendingKeys = await query
        .keyRequests(
          QueryKeyRequestsRequest.fromPartial({
            keychainId: Long.fromString(keychainId.toString(10)),
            status: KeyRequestStatus.KEY_REQUEST_STATUS_PENDING,
            pagination: PageRequest.fromPartial({ limit: Long.fromNumber(100) }),
          }),
        )
        .then((x) => x.keyRequests)
        .catch((e) => logError(e));

      if (!pendingKeys || pendingKeys.length === 0) continue;

      for (let i = 0; i < +pendingKeys.length; i++) {
        const key = pendingKeys[i];

        if (this.keys.has(longToBigInt(key.id))) continue;

        this.keys.set(BigInt(key.id.toString(10)), new Date().getTime() + keyRetentionMsec);

        yield {
          id: longToBigInt(key.id),
          keychainId: longToBigInt(key.keychainId),
          spaceId: longToBigInt(key.spaceId),
          creator: key.creator,
        };
      }
    }
  }

  async *pollPendingSignatureRequests(keychainId: bigint): AsyncGenerator<INewSignatureRequest> {
    const query = (await this.query()).warden.warden.v1beta2;

    while (true) {
      await delay(this.configuration.pollingIntervalMsec);

      logInfo(`Signatures in cache: ${this.signatures.size}`);

      for (const [id, retiredAt] of this.signatures) {
        const now = new Date().getTime();
        const request = await this.getSignatureRequest(id).catch((e) => logError(e));

        if ((!!request && request.status !== SignRequestStatus.SIGN_REQUEST_STATUS_PENDING) || retiredAt < now) {
          this.signatures.delete(id);
        }
      }

      const pendingSignatures = await query
        .signatureRequests(
          QuerySignatureRequestsRequest.fromPartial({
            keychainId: bigintToLong(keychainId),
            status: SignRequestStatus.SIGN_REQUEST_STATUS_PENDING,
            pagination: PageRequest.fromPartial({ limit: Long.fromNumber(100) }),
          }),
        )
        .then((x) => x.signRequests)
        .catch((e) => logError(e));

      if (!pendingSignatures || pendingSignatures.length === 0) continue;

      for (let i = 0; i < +pendingSignatures.length; i++) {
        const request = pendingSignatures[i];

        if (this.signatures.has(longToBigInt(request.id))) continue;

        this.signatures.set(longToBigInt(request.id), new Date().getTime() + keyRetentionMsec);

        const key = await query
          .keyById({
            id: request.keyId,
            deriveAddresses: [],
          })
          .then((x) => x.key)
          .catch((e) => logError(e));

        if (!key) continue;

        yield {
          id: longToBigInt(request.id),
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
      requestId: bigintToLong(requestId),
      key: { publicKey: publicKey },
      status: KeyRequestStatus.KEY_REQUEST_STATUS_FULFILLED,
    });

    const tx = await signer.client.signAndBroadcast(
      signer.account,
      [message],
      {
        gas: this.configuration.signerGas,
        amount: [{ denom: 'uward', amount: this.configuration.signerGasUwardAmount }],
      },
      '',
    );

    return { hash: tx.transactionHash, errorCode: tx.code };
  }

  async fulfilSignatureRequest(requestId: bigint, signedData: Buffer): Promise<ITransactionState> {
    const signer = await this.signer();

    const message = fulfilSignatureRequest({
      creator: signer.account,
      requestId: bigintToLong(requestId),
      status: SignRequestStatus.SIGN_REQUEST_STATUS_FULFILLED,
      payload: {
        signedData: signedData,
      },
    });

    const tx = await signer.client.signAndBroadcast(
      signer.account,
      [message],
      {
        gas: this.configuration.signerGas,
        amount: [{ denom: 'uward', amount: this.configuration.signerGasUwardAmount }],
      },
      '',
    );

    return { hash: tx.transactionHash, errorCode: tx.code };
  }

  async rejectKeyRequest(requestId: bigint, reason: string): Promise<ITransactionState> {
    const signer = await this.signer();

    const message = updateKeyRequest({
      creator: signer.account,
      requestId: bigintToLong(requestId),
      status: KeyRequestStatus.KEY_REQUEST_STATUS_REJECTED,
      rejectReason: reason,
    });

    const tx = await signer.client.signAndBroadcast(
      signer.account,
      [message],
      {
        gas: this.configuration.signerGas,
        amount: [{ denom: 'uward', amount: this.configuration.signerGasUwardAmount }],
      },
      '',
    );

    return { hash: tx.transactionHash, errorCode: tx.code };
  }

  async rejectSignatureRequest(requestId: bigint, reason: string): Promise<ITransactionState> {
    const signer = await this.signer();

    const message = fulfilSignatureRequest({
      creator: signer.account,
      requestId: bigintToLong(requestId),
      status: SignRequestStatus.SIGN_REQUEST_STATUS_REJECTED,
      rejectReason: reason,
    });

    const tx = await signer.client.signAndBroadcast(
      signer.account,
      [message],
      {
        gas: this.configuration.signerGas,
        amount: [{ denom: 'uward', amount: this.configuration.signerGasUwardAmount }],
      },
      '',
    );

    return { hash: tx.transactionHash, errorCode: tx.code };
  }

  async getKeyRequest(requestId: bigint): Promise<void | KeyRequest> {
    const query = (await this.query()).warden.warden.v1beta2;

    return await query
      .keyRequestById({ id: bigintToLong(requestId) })
      .then((x) => x.keyRequest)
      .catch((e) => logError(e));
  }

  async getSignatureRequest(requestId: bigint): Promise<void | SignRequest> {
    const query = (await this.query()).warden.warden.v1beta2;

    return await query
      .signatureRequestById({ id: bigintToLong(requestId) })
      .then((x) => x.signRequest)
      .catch((e) => logError(e));
  }
}

function longToBigInt(value: Long) {
  return BigInt(value.toString(10));
}

function bigintToLong(value: bigint) {
  return Long.fromString(value.toString(10));
}

export { INewKeyRequest } from './types/newKeyRequest';
export { INewSignatureRequest } from './types/newSignatureRequest';
