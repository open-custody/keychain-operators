import { WardenService } from '@warden/blockchain-library';
import { INewSignatureRequestMessage, KeyProvider, MessageBrokerConsumer } from '@warden/message-broker-library';
import { SignRequestStatus } from '@wardenprotocol/wardjs/dist/codegen/warden/warden/v1beta2/signature';

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
    console.log(`New Signature message: ${data.requestId}`);

    const requestId = BigInt(data.requestId);

    if (attempts === 0) {
      return await this.reject(requestId, `Failed to sign a message`);
    }

    const handler = this.keychainHandlers.get(data.provider);

    if (!handler) {
      return await this.reject(requestId, `Key provider is not supported: ${data.provider}`);
    }

    const request = await this.warden.getSignatureRequest(requestId);

    if (request && request.status !== SignRequestStatus.SIGN_REQUEST_STATUS_PENDING) {
      return true;
    }

    const result = await handler.sign(data);

    if (result.status === SignatureResultStatus.Pending) {
      return true;
    }

    if (result.status === SignatureResultStatus.Failed) {
      return await this.reject(requestId, result.reason);
    }

    return await this.fulfill(requestId, result.signature);
  }

  async fulfill(requestId: bigint, signedData: Buffer): Promise<boolean> {
    const transaction = await this.warden.fulfilSignatureRequest(requestId, signedData);
    return transaction && transaction.hash && transaction.errorCode === 0;
  }

  async reject(requestId: bigint, reason: string): Promise<boolean> {
    const transaction = await this.warden.rejectSignatureRequest(requestId, reason);
    return transaction && transaction.hash && transaction.errorCode === 0;
  }
}
