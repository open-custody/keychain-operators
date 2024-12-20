import { INewKeyRequest } from '@warden/blockchain-library';
import { INewKeyRequestMessage, KeyProvider, MessageBrokerProducer } from '@warden/message-broker-library';
import { logError, logInfo, serialize } from '@warden/utils';

import { Processor } from './processor.js';

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
      logInfo(`New Key request ${serialize(data)}`);

      return this.producer.publish<INewKeyRequestMessage>({
        provider: this.provider,
        creator: data.creator,
        keychainId: data.keychainId.toString(),
        requestId: data.id.toString(),
        spaceId: data.spaceId.toString(),
      });
    } catch (error) {
      logError(`New key error ${serialize(data)}. Error: ${error}, Stack trace: ${error.stack}`);

      return false;
    }
  }
}
