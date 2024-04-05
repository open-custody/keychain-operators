import { INewKeyRequest } from '@warden/blockchain-library';
import { INewKeyRequestMessage, KeyProvider, MessageBrokerProducer } from '@warden/message-broker-library';

import { Processor } from './processor';

export class NewKeyProcessor extends Processor<INewKeyRequest> {
  constructor(
    keychainId: bigint,
    generator: (keychainId: bigint) => AsyncGenerator<INewKeyRequest, any, unknown>,
    private producer: MessageBrokerProducer,
    private provider: KeyProvider,
  ) {
    super(keychainId, generator);
  }

  async handle(data: INewKeyRequest): Promise<boolean> {
    try {
      console.log(`New Key request: ${data.id}`);

      return this.producer.publish<INewKeyRequestMessage>({
        provider: this.provider,
        creator: data.creator,
        keychainId: data.keychainId.toString(),
        requestId: data.id.toString(),
        spaceId: data.spaceId.toString(),
      });
    } catch (error) {
      console.error(error);

      return false;
    }
  }
}
