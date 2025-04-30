import { serialize } from '@warden/utils';

import { MessageBroker } from './broker.js';

export class MessageBrokerProducer extends MessageBroker {
  async publish<T>(message: T): Promise<boolean> {
    const bytes = Buffer.from(serialize(message));
    const channel = await this.getChannel();

    return channel.sendToQueue(this.configuration.queue, bytes, { persistent: true });
  }
}
