import { Inject, Injectable } from '@nestjs/common';
import { MessageBrokerProducer } from '@warden/message-broker-library';

import { TOKEN as messageBrokerToken } from '../infrastructure/messageBroker.provider';

@Injectable()
export class MessageProducerService {
  constructor(@Inject(messageBrokerToken) private producer: MessageBrokerProducer) {}

  async produce<T>(message: T): Promise<boolean> {
    try {
      return this.producer.publish<T>(message);
    } catch (error) {
      console.error(error);

      return false;
    }
  }
}
