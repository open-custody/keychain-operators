import { MessageBroker } from './broker';
import { IMessageBrokerConsumerConfiguration } from './types/configuration';

export class MessageBrokerConsumer extends MessageBroker {
  async consume<T>(
    configuration: IMessageBrokerConsumerConfiguration,
    handle: (message: T) => Promise<boolean | undefined>,
  ) {
    await this.channel.prefetch(configuration.prefetch);

    await this.channel.consume(
      this.configuration.queue,
      (message) => {
        const obj = JSON.parse(message!.content.toString());

        handle(obj)
          .then((handled) => {
            if (handled) this.channel.ack(message!);
            else this.channel.reject(message!, false);
          })
          .catch(console.error);
      },
      {
        noAck: false,
      },
    );
  }
}
