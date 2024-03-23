import { MessageBroker } from './broker';
import { IMessageBrokerConsumerConfiguration } from './types/configuration';

export class MessageBrokerConsumer extends MessageBroker {
  async consume<T>(configuration: IMessageBrokerConsumerConfiguration, handle: (message: T) => Promise<boolean>) {
    await this.channel.prefetch(configuration.prefetch);

    await this.channel.consume(
      this.configuration.queue,
      async (message) => {
        const obj = JSON.parse(message.content.toString());

        if (!(await handle(obj))) return;

        this.channel.ack(message);
      },
      {
        noAck: false,
      },
    );
  }
}
