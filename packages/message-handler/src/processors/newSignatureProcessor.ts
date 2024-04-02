import { WardenService } from '@warden/blockchain-library';
import { INewSignatureRequestMessage, KeyProvider, MessageBrokerConsumer } from '@warden/message-broker-library';

import { IKeychainHandler } from '../keychains/keychainHandler';
import { SignatureResultStatus } from '../types/signResult';
import { Processor } from './processor';

export class NewSignatureProcessor extends Processor<INewSignatureRequestMessage> {
  constructor(
    private keychainHandlers: Map<KeyProvider, IKeychainHandler>,
    warden: WardenService,
    consumer: MessageBrokerConsumer,
    prefetch: number,
    retryAttempts: number,
  ) {
    super(warden, consumer, prefetch, retryAttempts);
  }

  async handle(data: INewSignatureRequestMessage, attempts: number): Promise<boolean> {
    if (attempts === 0) {
      return await this.reject(+data.requestId, `Failed to sign a message`);
    }

    const handler = this.keychainHandlers.get(data.provider);

    if (!handler) {
      return await this.reject(+data.requestId, `Key provider is not supported: ${data.provider}`);
    }

    const request = await this.warden.getSignatureRequest(data.requestId);

    if (request && request.status !== 'SIGN_REQUEST_STATUS_PENDING') {
      return true;
    }

    const result = await handler.sign(data);

    if (result.status === SignatureResultStatus.Pending) {
      return true;
    }

    if (result.status === SignatureResultStatus.Failed) {
      return await this.reject(+data.requestId, result.reason);
    }

    return await this.fulfill(+data.requestId, result.signature);
  }

  async fulfill(requestId: number, signedData: Buffer): Promise<boolean> {
    const transaction = await this.warden.fulfilSignatureRequest(requestId, signedData);
    return transaction && transaction.hash && transaction.errorCode === 0;
  }

  async reject(requestId: number, reason: string): Promise<boolean> {
    const transaction = await this.warden.rejectSignatureRequest(requestId, reason);
    return transaction && transaction.hash && transaction.errorCode === 0;
  }
}
