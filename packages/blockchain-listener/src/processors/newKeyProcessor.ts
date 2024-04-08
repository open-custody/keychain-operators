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
    const log = `(id: ${data.id}, provider: ${this.provider}, creator: ${data.creator}, keychain: ${data.keychainId})`;

    try {
      console.log(`New Key request ${log}`);

      return this.producer.publish<INewKeyRequestMessage>({
        provider: this.provider,
        creator: data.creator,
        keychainId: data.keychainId.toString(),
        requestId: data.id.toString(),
        spaceId: data.spaceId.toString(),
      });
    } catch (error) {
      console.error(`New key error ${log}: . Message: ${error}`);

      return false;
    }
  }
}
