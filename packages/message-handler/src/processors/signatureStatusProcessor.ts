import { WardenService } from '@warden/blockchain-library';
import { ISignatureStatusMessage, KeyProvider, MessageBrokerConsumer } from '@warden/message-broker-library';

import { IKeychainHandler } from '../keychains/keychainHandler';
import { Processor } from './processor';

export class SignatureStatusProcessor extends Processor<ISignatureStatusMessage> {
  constructor(
    private keychainHandlers: Map<KeyProvider, IKeychainHandler>,
    warden: WardenService,
    consumer: MessageBrokerConsumer,
    prefetch: number,
    retryAttempts: number,
  ) {
    super(warden, consumer, prefetch, retryAttempts);
  }

  async handle(data: ISignatureStatusMessage, attempts: number): Promise<boolean> {
    if (attempts === 0) {
      return await this.reject(+data.requestId, 'Failed to fulfil signature request');
    }

    const handler = this.keychainHandlers.get(data.provider);

    if (!handler) {
      return await this.reject(+data.requestId, `Key provider is not supported: ${data.provider}`);
    }

    const request = await this.warden.getSignatureRequest(data.requestId.toString(10));

    if (request && request.status !== 'SIGN_REQUEST_STATUS_PENDING') {
      return true;
    }

    if (data.success) {
      const signature = await handler.getSignature(data);

      return await this.fulfill(+data.requestId, signature);
    } else {
      return await this.reject(+data.requestId, data.reason);
    }
  }

  async fulfill(requestId: number, signature: Buffer) {
    const transaction = await this.warden.fulfilSignatureRequest(requestId, signature);
    return transaction && transaction.hash && transaction.errorCode === 0;
  }

  async reject(requestId: number, reason: string) {
    const transaction = await this.warden.rejectSignatureRequest(requestId, reason);
    return transaction && transaction.hash && transaction.errorCode === 0;
  }
}