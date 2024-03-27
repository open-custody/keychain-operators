import { INewKeyRequest } from '@warden/blockchain-library';
import { INewKeyRequestMessage, KeyProvider, MessageBrokerProducer } from '@warden/message-broker-library';

import { Processor } from './processor';

export class NewKeyProcessor extends Processor<INewKeyRequest> {
  constructor(
    generator: AsyncGenerator<INewKeyRequest>,
    private producer: MessageBrokerProducer,
    private provider: KeyProvider,
  ) {
    super(generator);
  }

  async handle(data: INewKeyRequest): Promise<boolean> {
    try {
      return this.producer.publish<INewKeyRequestMessage>({
        provider: this.provider,
        creator: data.creator,
        keychainId: data.keychainId,
        requestId: data.id,
        spaceId: data.spaceId,
      });
    } catch (error) {
      console.error(error);

      return false;
    }
  }
}
