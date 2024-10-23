import { WardenService } from '@warden/blockchain-library';
import { INewKeyRequestMessage, KeyProvider, MessageBrokerConsumer } from '@warden/message-broker-library';
import { logError, logInfo, serialize } from '@warden/utils';
import { KeyRequestStatus } from '@wardenprotocol/wardenjs/codegen/warden/warden/v1beta3/key';

import { IKeychainHandler } from '../keychains/keychainHandler.js';
import { Processor } from './processor.js';

export class NewKeyProcessor extends Processor<INewKeyRequestMessage> {
  constructor(
    private keychainHandlers: Map<KeyProvider, IKeychainHandler>,
    warden: WardenService,
    consumer: MessageBrokerConsumer,
    prefetch: number,
    retryAttempts: number,
  ) {
    super(warden, consumer, prefetch, retryAttempts);
  }

  async handle(data: INewKeyRequestMessage, attempts: number): Promise<boolean> {
    logInfo(`New Key message ${serialize(data)}`);

    const requestId = BigInt(data.requestId);
    logInfo(`New request id ${requestId}`);

    if (attempts === 0) {
      logError(`New Key message error after ${this.retryAttempts} attempts: ${serialize(data)}`);

      return await this.reject(requestId, `Failed to create a new key`);
    }

    const handler = this.keychainHandlers.get(data.provider);

    if (!handler) {
      return await this.reject(requestId, `Key provider is not supported: ${data.provider}`);
    }

    const request = await this.warden.getKeyRequest(requestId);

    if (request && request.status !== KeyRequestStatus.KEY_REQUEST_STATUS_PENDING) {
      return true;
    }

    const publicKey = await handler.createKey(data);

    logInfo(`New fulfillment: requestId = ${requestId}, public key = ${publicKey}`);

    return await this.fulfill(requestId, publicKey);
  }

  async fulfill(requestId: bigint, publiCKey: Buffer): Promise<boolean> {
    const transaction = await this.warden.fulfilKeyRequest(requestId, publiCKey);
    return transaction?.hash !== undefined && transaction?.errorCode === 0;
  }

  async reject(requestId: bigint, reason: string): Promise<boolean> {
    const transaction = await this.warden.rejectKeyRequest(requestId, reason);
    return transaction?.hash !== undefined && transaction?.errorCode === 0;
  }
}
