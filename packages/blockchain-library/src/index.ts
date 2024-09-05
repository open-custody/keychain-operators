import { stringToPath } from '@cosmjs/crypto';
import { DirectSecp256k1HdWallet, Registry } from '@cosmjs/proto-signing';
import { IndexedTx, SigningStargateClient } from '@cosmjs/stargate';
import * as utils from '@warden/utils';
import { cosmosProtoRegistry, warden, wardenProtoRegistry } from '@wardenprotocol/wardenjs';
import { PageRequest } from '@wardenprotocol/wardenjs/codegen/cosmos/base/query/v1beta1/pagination';
import { KeyRequest, KeyRequestStatus } from '@wardenprotocol/wardenjs/codegen/warden/warden/v1beta3/key';
import {
  QueryKeyRequestsRequest,
  QuerySignRequestsRequest,
} from '@wardenprotocol/wardenjs/codegen/warden/warden/v1beta3/query';
import { SignRequest, SignRequestStatus } from '@wardenprotocol/wardenjs/codegen/warden/warden/v1beta3/signature';

import { IWardenConfiguration } from './types/configuration.js';
import { INewKeyRequest } from './types/newKeyRequest.js';
import { INewSignatureRequest } from './types/newSignatureRequest.js';
import { ISigner } from './types/signer.js';
import { ITransactionState } from './types/transactionState.js';

const { delay, logError, logInfo } = utils;
const { createRPCQueryClient } = warden.ClientFactory;
const { fulfilKeyRequest, fulfilSignRequest } = warden.warden.v1beta3.MessageComposer.withTypeUrl;

const keyRetentionMsec = 60_000;

export class WardenService {
  locked: boolean;
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
      hdPaths: [stringToPath(this.configuration.signerDerivationPath)],
    });

    const accounts = await wallet.getAccounts();
    const account = accounts[0].address;

    const client = await SigningStargateClient.connectWithSigner(this.configuration.rpcURL, wallet, {
      registry: new Registry([...wardenProtoRegistry, ...cosmosProtoRegistry]),
    });

    return { client, account };
  }

  async *pollPendingKeyRequests(keychainId: bigint): AsyncGenerator<INewKeyRequest> {
    const query = (await this.query()).warden.warden.v1beta3;

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
            keychainId: keychainId,
            status: KeyRequestStatus.KEY_REQUEST_STATUS_PENDING,
            pagination: PageRequest.fromPartial({ limit: 100n }),
          }),
        )
        .then((x) => x.keyRequests)
        .catch((e) => logError(e));

      if (!pendingKeys || pendingKeys.length === 0) continue;

      for (let i = 0; i < +pendingKeys.length; i++) {
        const key = pendingKeys[i];

        if (this.keys.has(key.id)) continue;

        this.keys.set(BigInt(key.id.toString(10)), new Date().getTime() + keyRetentionMsec);

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
    const query = (await this.query()).warden.warden.v1beta3;

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
        .signRequests(
          QuerySignRequestsRequest.fromPartial({
            keychainId: keychainId,
            status: SignRequestStatus.SIGN_REQUEST_STATUS_PENDING,
            pagination: PageRequest.fromPartial({ limit: 100n }),
          }),
        )
        .then((x) => x.signRequests)
        .catch((e) => logError(e));

      if (!pendingSignatures || pendingSignatures.length === 0) continue;

      for (let i = 0; i < +pendingSignatures.length; i++) {
        const request = pendingSignatures[i];

        if (this.signatures.has(request.id)) continue;

        this.signatures.set(request.id, new Date().getTime() + keyRetentionMsec);

        const key = await query
          .keyById({
            id: request.keyId,
            deriveAddresses: [],
          })
          .then((x) => x.key)
          .catch((e) => logError(e));

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

    const message = fulfilKeyRequest({
      creator: signer.account,
      requestId: requestId,
      key: { publicKey: publicKey },
      status: KeyRequestStatus.KEY_REQUEST_STATUS_FULFILLED,
    });

    const hash = await signer.client.signAndBroadcastSync(
      signer.account,
      [message],
      {
        gas: this.configuration.signerGas,
        amount: [{ denom: 'uward', amount: this.configuration.signerGasUwardAmount }],
      },
      '',
    );

    return this.waitTx(signer, hash);
  }

  async fulfilSignatureRequest(requestId: bigint, signedData: Buffer): Promise<ITransactionState> {
    const signer = await this.signer();

    const message = fulfilSignRequest({
      creator: signer.account,
      requestId: requestId,
      status: SignRequestStatus.SIGN_REQUEST_STATUS_FULFILLED,
      payload: {
        signedData: signedData,
      },
    });

    const hash = await signer.client.signAndBroadcastSync(
      signer.account,
      [message],
      {
        gas: this.configuration.signerGas,
        amount: [{ denom: 'uward', amount: this.configuration.signerGasUwardAmount }],
      },
      '',
    );

    return this.waitTx(signer, hash);
  }

  async rejectKeyRequest(requestId: bigint, reason: string): Promise<ITransactionState> {
    const signer = await this.signer();

    const message = fulfilKeyRequest({
      creator: signer.account,
      requestId: requestId,
      status: KeyRequestStatus.KEY_REQUEST_STATUS_REJECTED,
      rejectReason: reason,
    });

    const hash = await signer.client.signAndBroadcastSync(
      signer.account,
      [message],
      {
        gas: this.configuration.signerGas,
        amount: [{ denom: 'uward', amount: this.configuration.signerGasUwardAmount }],
      },
      '',
    );

    return this.waitTx(signer, hash);
  }

  async rejectSignatureRequest(requestId: bigint, reason: string): Promise<ITransactionState> {
    const signer = await this.signer();

    const message = fulfilSignRequest({
      creator: signer.account,
      requestId: requestId,
      status: SignRequestStatus.SIGN_REQUEST_STATUS_REJECTED,
      rejectReason: reason,
    });

    const hash = await signer.client.signAndBroadcastSync(
      signer.account,
      [message],
      {
        gas: this.configuration.signerGas,
        amount: [{ denom: 'uward', amount: this.configuration.signerGasUwardAmount }],
      },
      '',
    );

    return this.waitTx(signer, hash);
  }

  async getKeyRequest(requestId: bigint): Promise<void | KeyRequest> {
    const query = (await this.query()).warden.warden.v1beta3;

    return await query
      .keyRequestById({ id: requestId })
      .then((x) => x.keyRequest)
      .catch((e) => logError(e));
  }

  async getSignatureRequest(requestId: bigint): Promise<void | SignRequest> {
    const query = (await this.query()).warden.warden.v1beta3;

    return await query
      .signRequestById({ id: requestId })
      .then((x) => x.signRequest)
      .catch((e) => logError(e));
  }

  async waitTx(signer: ISigner, hash: string): Promise<ITransactionState> {
    let transaction: IndexedTx | null = null;
    const timeout = new Date().getTime() + 1000 * 60;

    while (this.locked) {
      await delay(1000);
    }

    try {
      this.locked = true;

      while (!transaction && new Date().getTime() < timeout) {
        transaction = await signer.client.getTx(hash);

        await delay(1000);
      }
    } catch {
      logError(`Failed to fetch transaction status: ${hash}`);
    } finally {
      this.locked = false;
    }

    if (!transaction) {
      throw new Error(`Failed to wait for transaction: ${hash}`);
    }

    return { hash: transaction.hash, errorCode: transaction.code };
  }
}

export { INewKeyRequest } from './types/newKeyRequest.js';
export { INewSignatureRequest } from './types/newSignatureRequest.js';
