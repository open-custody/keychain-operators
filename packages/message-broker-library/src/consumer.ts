import { logError } from '@warden/utils';

import { MessageBroker } from './broker.js';
import { IMessageBrokerConsumerConfiguration } from './types/configuration.js';

export class MessageBrokerConsumer extends MessageBroker {
  private isConsuming: boolean = false;
  private consumerConfig: IMessageBrokerConsumerConfiguration | null = null;
  private messageHandler: ((message: unknown) => Promise<boolean | undefined>) | null = null;

  async consume<T>(
    configuration: IMessageBrokerConsumerConfiguration,
    handle: (message: T) => Promise<boolean | undefined>,
  ) {
    if (this.isConsuming) {
      return;
    }

    this.consumerConfig = configuration;
    this.messageHandler = handle as (message: unknown) => Promise<boolean | undefined>;
    this.isConsuming = true;
    await this.startConsuming();
  }

  private async startConsuming() {
    if (!this.consumerConfig || !this.messageHandler) {
      return;
    }

    try {
      const channel = await this.getChannel();
      await channel.prefetch(this.consumerConfig.prefetch);
      await channel.consume(
        this.configuration.queue,
        async (message) => {
          if (!message) {
            return;
          }

          try {
            const obj = JSON.parse(message.content.toString());
            const handled = await this.messageHandler!(obj);

            if (handled) {
              channel.ack(message);
            } else {
              channel.reject(message, false);
            }
          } catch (error) {
            logError(`Error processing message: ${error}`);
            channel.reject(message, false);
          }
        },
        {
          noAck: false,
        },
      );
    } catch (error) {
      logError(`Error starting consumer: ${error}`);
      this.isConsuming = false;
      throw error;
    }
  }

  async stopConsuming(): Promise<void> {
    if (!this.isConsuming) {
      return;
    }

    this.isConsuming = false;
  }

  protected async onConnectionClosed(): Promise<void> {
    await this.stopConsuming();
  }

  protected async onConnectionEstablished(): Promise<void> {
    if (!this.isConsuming) {
      await this.startConsuming();
    }
  }
}
