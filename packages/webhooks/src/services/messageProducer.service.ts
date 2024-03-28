import { Inject, Injectable } from '@nestjs/common';
import { MessageBrokerProducer } from '@warden/message-broker-library';
import { IFulfilSignatureRequestMessage } from '@warden/message-broker-library';

import { TOKEN as messageBrokerToken } from '../infrastructure/messageBroker.provider';

@Injectable()
export class MessageProducerService {
  constructor(@Inject(messageBrokerToken) private producer: MessageBrokerProducer) {}

  async produce(message: IFulfilSignatureRequestMessage): Promise<boolean> {
    try {
      return this.producer.publish<IFulfilSignatureRequestMessage>(message);
    } catch (error) {
      console.error(error);

      return false;
    }
  }
}
