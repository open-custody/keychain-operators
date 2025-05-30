import { INewSignatureRequest } from '@warden/blockchain-library';
import { INewSignatureRequestMessage, KeyProvider, MessageBrokerProducer } from '@warden/message-broker-library';
import { logError, logInfo, serialize } from '@warden/utils';

import { Processor } from './processor.js';

export class NewSignatureProcessor extends Processor<INewSignatureRequest> {
  constructor(
    keychainId: bigint,
    generator: (keychainId: bigint) => AsyncGenerator<INewSignatureRequest, any, unknown>,
    private producer: MessageBrokerProducer,
    private provider: KeyProvider,
  ) {
    super(keychainId, generator);
  }

  async handle(data: INewSignatureRequest): Promise<boolean> {
    try {
      logInfo(`New Signature request ${serialize(data)}`);

      return this.producer.publish<INewSignatureRequestMessage>({
        provider: this.provider,
        creator: data.creator,
        publicKey: Buffer.from(data.publicKey).toString('base64'),
        keychainId: data.keychainId.toString(),
        requestId: data.id.toString(),
        signingData: Buffer.from(data.signingData).toString('base64'),
      });
    } catch (error) {
      logError(`New Signature error ${serialize(data)}. Error: ${error}, Stack trace: ${error.stack}`);

      return false;
    }
  }
}
