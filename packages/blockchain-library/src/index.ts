import { toBech32 } from '@cosmjs/encoding';
import { Int53 } from '@cosmjs/math';
import { EncodeObject, TxBodyEncodeObject, makeAuthInfoBytes, makeSignDoc } from '@cosmjs/proto-signing';
import * as utils from '@warden/utils';
import { toUint8Array } from '@warden/utils';
import { cosmos, ethermint, getSigningWardenClientOptions, google, warden } from '@wardenprotocol/wardenjs';
import { PageRequest } from '@wardenprotocol/wardenjs/codegen/cosmos/base/query/v1beta1/pagination';
import { GetTxResponse } from '@wardenprotocol/wardenjs/codegen/cosmos/tx/v1beta1/service';
import { KeyRequest, KeyRequestStatus } from '@wardenprotocol/wardenjs/codegen/warden/warden/v1beta3/key';
import {
  QueryKeyRequestsRequest,
  QuerySignRequestsRequest,
} from '@wardenprotocol/wardenjs/codegen/warden/warden/v1beta3/query';
import { SignRequest, SignRequestStatus } from '@wardenprotocol/wardenjs/codegen/warden/warden/v1beta3/signature';
import { ethers } from 'ethers';

import { IWardenConfiguration } from './types/configuration.js';
import { INewKeyRequest } from './types/newKeyRequest.js';
import { INewSignatureRequest } from './types/newSignatureRequest.js';
import { ISigner } from './types/signer.js';
import { ITransactionState } from './types/transactionState.js';

const { Any } = google.protobuf;
const PubKey = ethermint.crypto.v1.ethsecp256k1.PubKey;
const { TxBody, TxRaw, SignDoc } = cosmos.tx.v1beta1;
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
    const ethWallet = ethers.Wallet.fromPhrase(this.configuration.signerMnemonic);
    const ethAddress = ethWallet.address;
    const wardenAddress = toBech32(this.configuration.prefix, ethers.getBytes(ethAddress));
    const pubkey = ethers.getBytes(ethWallet.publicKey);

    return {
      wallet: ethWallet,
      account: wardenAddress,
      signerPubKey: pubkey,
    };
  }

  async account(signer: ISigner) {
    const query = (await this.query()).cosmos.auth.v1beta1;
    const { account } = await query.account({ address: signer.account });

    if (account?.typeUrl === ethermint.types.v1.EthAccount.typeUrl) {
      const ethAccount = ethermint.types.v1.EthAccount.decode(account.value);

      if (!ethAccount.baseAccount) {
        throw new Error('Failed to decode account eth account');
      }

      return ethAccount.baseAccount;
    }

    return account;
  }

  async signAndBroadcast(signer: ISigner, messages: EncodeObject[]) {
    const account = await this.account(signer);

    const pubk = Any.fromPartial({
      typeUrl: PubKey.typeUrl,
      value: PubKey.encode({
        key: signer.signerPubKey,
      }).finish(),
    });

    const txBody = TxBody.fromPartial({
      messages: messages,
      memo: '',
    });

    const txBodyEncodeObject: TxBodyEncodeObject = {
      typeUrl: '/cosmos.tx.v1beta1.TxBody',
      value: txBody,
    };

    const { registry } = getSigningWardenClientOptions();
    const txBodyBytes = registry.encode(txBodyEncodeObject);
    const gasLimit = Int53.fromString(this.configuration.signerGas).toNumber();
    const authInfoBytes = makeAuthInfoBytes(
      [{ pubkey: pubk, sequence: account!.sequence }],
      [{ denom: 'award', amount: this.configuration.signerGasUwardAmount }],
      gasLimit,
      undefined,
      undefined,
    );
    const signDoc = makeSignDoc(txBodyBytes, authInfoBytes, this.configuration.chainId, Number(account!.accountNumber));

    const signDocBytes = SignDoc.encode(signDoc).finish();
    const signatureRaw = signer.wallet.signingKey.sign(ethers.keccak256(signDocBytes));
    const signature = ethers.Signature.from(signatureRaw);
    const signatureRS = ethers.concat([signature.r, signature.s]);
    const signatureRSBytes = ethers.getBytes(signatureRS);

    const signedTx = TxRaw.encode(
      TxRaw.fromPartial({
        authInfoBytes: signDoc.authInfoBytes,
        bodyBytes: signDoc.bodyBytes,
        signatures: [signatureRSBytes],
      }),
    ).finish();

    const response = await fetch(`${this.configuration.apiURL}/cosmos/tx/v1beta1/txs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_bytes: ethers.encodeBase64(signedTx),
        mode: 'BROADCAST_MODE_SYNC',
      }),
    });

    const resJson = await response.json();

    return resJson.tx_response.txhash;
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

  async fulfilKeyRequest(requestId: bigint, publicKey: Buffer): Promise<ITransactionState | undefined> {
    const signer = await this.signer();

    const message = fulfilKeyRequest({
      creator: signer.account,
      requestId: requestId,
      key: { publicKey: toUint8Array(publicKey) },
      status: KeyRequestStatus.KEY_REQUEST_STATUS_FULFILLED,
    });

    const txHash = await this.signAndBroadcast(signer, [message]);

    return await this.waitTx(txHash);
  }

  async fulfilSignatureRequest(requestId: bigint, signedData: Buffer): Promise<ITransactionState | undefined> {
    const signer = await this.signer();

    const message = fulfilSignRequest({
      creator: signer.account,
      requestId: requestId,
      status: SignRequestStatus.SIGN_REQUEST_STATUS_FULFILLED,
      payload: {
        signedData: toUint8Array(signedData),
      },
    });

    const txHash = await this.signAndBroadcast(signer, [message]);

    return await this.waitTx(txHash);
  }

  async rejectKeyRequest(requestId: bigint, reason: string): Promise<ITransactionState | undefined> {
    const signer = await this.signer();

    const message = fulfilKeyRequest({
      creator: signer.account,
      requestId: requestId,
      status: KeyRequestStatus.KEY_REQUEST_STATUS_REJECTED,
      rejectReason: reason,
    });

    const txHash = await this.signAndBroadcast(signer, [message]);

    return await this.waitTx(txHash);
  }

  async rejectSignatureRequest(requestId: bigint, reason: string): Promise<ITransactionState | undefined> {
    const signer = await this.signer();

    const message = fulfilSignRequest({
      creator: signer.account,
      requestId: requestId,
      status: SignRequestStatus.SIGN_REQUEST_STATUS_REJECTED,
      rejectReason: reason,
    });

    const txHash = await this.signAndBroadcast(signer, [message]);

    return await this.waitTx(txHash);
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

  async waitTx(hash?: string): Promise<ITransactionState | undefined> {
    if (!hash) {
      return undefined;
    }

    const query = (await this.query()).cosmos.tx;

    let transaction: GetTxResponse | null = null;
    const timeout = new Date().getTime() + 1000 * 60;

    while (this.locked) {
      await delay(1000);
    }

    this.locked = true;

    while (!transaction && new Date().getTime() < timeout) {
      try {
        transaction = await query.v1beta1.getTx({
          hash,
        });
      } catch {
        logInfo(`Fetching the transaction: ${hash}`);
      }

      await delay(1000);
    }

    this.locked = false;

    if (!transaction) {
      throw new Error(`Failed to wait for transaction: ${hash}`);
    }

    return { hash: transaction?.txResponse?.txhash, errorCode: transaction?.txResponse?.code ?? 0 };
  }
}

export { INewKeyRequest } from './types/newKeyRequest.js';
export { INewSignatureRequest } from './types/newSignatureRequest.js';
