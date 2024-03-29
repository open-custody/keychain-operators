import { INewSignatureRequest } from '@warden/blockchain-library';
import { INewSignatureRequestMessage, KeyProvider, MessageBrokerProducer } from '@warden/message-broker-library';

import { Processor } from './processor';

export class NewSignatureProcessor extends Processor<INewSignatureRequest> {
  constructor(
    generator: AsyncGenerator<INewSignatureRequest>,
    private producer: MessageBrokerProducer,
    private provider: KeyProvider,
  ) {
    super(generator);
  }

  async handle(data: INewSignatureRequest): Promise<boolean> {
    try {
      console.log(`New Signature request: ${data.id}`);

      return this.producer.publish<INewSignatureRequestMessage>({
        provider: this.provider,
        creator: data.creator,
        keyId: data.keyId,
        keychainId: data.keychainId,
        requestId: data.id,
        keyType: data.keyType,
        signingData: data.signingData,
      });
    } catch (error) {
      console.error(error);

      return false;
    }
  }
}
