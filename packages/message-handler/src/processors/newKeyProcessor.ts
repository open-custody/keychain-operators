import { WardenService } from '@warden/blockchain-library';
import { INewKeyRequestMessage, KeyProvider, MessageBrokerConsumer } from '@warden/message-broker-library';

import { IKeychainHandler } from '../keychains/keychainHandler';
import { Processor } from './processor';

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
    if (attempts === 0) {
      return await this.reject(+data.requestId, `Failed to create a new key`);
    }

    const handler = this.keychainHandlers.get(data.provider);

    if (!handler) {
      return await this.reject(+data.requestId, `Key provider is not supported: ${data.provider}`);
    }

    const request = await this.warden.getKeyRequest(data.requestId);

    if (request && request.status !== 'KEY_REQUEST_STATUS_PENDING') {
      return true;
    }

    const publicKey = await handler.createKey(data);

    return await this.fulfill(+data.requestId, publicKey);
  }

  async fulfill(requestId: number, publiCKey: Buffer) {
    const transaction = await this.warden.fulfilKeyRequest(requestId, publiCKey);
    return transaction && transaction.hash && transaction.errorCode === 0;
  }

  async reject(requestId: number, reason: string) {
    const transaction = await this.warden.rejectKeyRequest(requestId, reason);
    return transaction && transaction.hash && transaction.errorCode === 0;
  }
}
