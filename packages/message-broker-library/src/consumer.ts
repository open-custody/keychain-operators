import { logError } from '@warden/utils';

import { MessageBroker } from './broker.js';
import { IMessageBrokerConsumerConfiguration } from './types/configuration.js';

export class MessageBrokerConsumer extends MessageBroker {
  async consume<T>(
    configuration: IMessageBrokerConsumerConfiguration,
    handle: (message: T) => Promise<boolean | undefined>,
  ) {
    const channel = await this.getChannel();
    await channel.prefetch(configuration.prefetch);

    await channel.consume(
      this.configuration.queue,
      (message) => {
        const obj = JSON.parse(message!.content.toString());

        handle(obj)
          .then((handled) => {
            if (handled) channel.ack(message!);
            else channel.reject(message!, false);
          })
          .catch((e) => logError(e));
      },
      {
        noAck: false,
      },
    );
  }
}
