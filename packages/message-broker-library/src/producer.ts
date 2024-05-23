import { serialize } from '@warden/utils';

import { MessageBroker } from './broker.js';

export class MessageBrokerProducer extends MessageBroker {
  async publish<T>(message: T): Promise<boolean> {
    const bytes = Buffer.from(serialize(message));

    return this.channel.sendToQueue(this.configuration.queue, bytes, { persistent: true });
  }
}
