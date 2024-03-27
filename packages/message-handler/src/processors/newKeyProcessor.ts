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
  ) {
    super(warden, consumer, prefetch);
  }

  async handle(data: INewKeyRequestMessage): Promise<boolean> {
    try {
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

      // TODO: reject on 3rd attempt
    } catch (error) {
      console.error(error);

      return false;
    }
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
