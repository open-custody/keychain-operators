import { MessageBroker } from './broker';

export class MessageBrokerProducer extends MessageBroker {
  async publish<T>(message: T): Promise<boolean> {
    const bytes = Buffer.from(JSON.stringify(message));

    return this.channel.sendToQueue(this.configuration.queue, bytes, { persistent: true });
  }
}
