import { WardenService } from '@warden/blockchain-library';
import { ISignatureStatusMessage, KeyProvider, MessageBrokerConsumer } from '@warden/message-broker-library';
import { logError, logInfo } from '@warden/utils';
import { SignRequestStatus } from '@wardenprotocol/wardjs/dist/codegen/warden/warden/v1beta2/signature';

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
    logInfo(`New Signature Status message ${JSON.stringify(data)}`);

    const requestId = BigInt(data.requestId);

    if (attempts === 0) {
      logError(`New Signature Status message error after ${this.retryAttempts} attempts: ${JSON.stringify(data)}`);

      return await this.reject(requestId, 'Failed to fulfil signature request');
    }

    const handler = this.keychainHandlers.get(data.provider);

    if (!handler) {
      return await this.reject(requestId, `Key provider is not supported: ${data.provider}`);
    }

    const request = await this.warden.getSignatureRequest(requestId);

    if (request && request.status !== SignRequestStatus.SIGN_REQUEST_STATUS_PENDING) {
      return true;
    }

    if (data.success) {
      const signature = await handler.getSignature(data);

      return await this.fulfill(requestId, signature);
    } else {
      return await this.reject(requestId, data.reason);
    }
  }

  async fulfill(requestId: bigint, signature: Buffer): Promise<boolean> {
    const transaction = await this.warden.fulfilSignatureRequest(requestId, signature);
    return transaction?.hash !== undefined && transaction?.errorCode === 0;
  }

  async reject(requestId: bigint, reason: string): Promise<boolean> {
    const transaction = await this.warden.rejectSignatureRequest(requestId, reason);
    return transaction?.hash !== undefined && transaction?.errorCode === 0;
  }
}
