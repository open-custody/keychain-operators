import { delay } from '@warden/utils';
import { Channel, Connection, connect } from 'amqplib';

import { IMessageBrokerConfiguration } from './types/configuration';

export abstract class MessageBroker {
  channel: Channel;
  connection: Connection;
  configuration: IMessageBrokerConfiguration;

  constructor(configuration: IMessageBrokerConfiguration) {
    this.configuration = configuration;
  }

  async initConnection(): Promise<void> {
    await connect(this.configuration.connectionString)
      .then(async (connection) => {
        connection.once('error', async (error) => {
          console.error(error);

          connection.close().catch(console.error);
        });

        connection.once('close', async (error) => {
          console.error(error);

          await delay(this.configuration.reconnectMsec);
          await this.initConnection();
        });

        this.connection = connection;
      })
      .then(async (_) => await this.initChannel())
      .catch(async (error) => {
        console.error(error);

        await delay(this.configuration.reconnectMsec);
        await this.initConnection();
      });
  }

  async initChannel(): Promise<void> {
    await this.connection
      .createChannel()
      .then(async (channel) => {
        channel.once('error', async (error) => {
          console.error(error);

          await channel.close().catch(console.error);
        });

        channel.once('close', async (error) => {
          console.error(error);

          await delay(this.configuration.reconnectMsec);
          await this.initConnection();
        });

        this.channel = channel;

        await channel.assertQueue(this.configuration.queue, { durable: true });
      })
      .catch(async (error) => {
        console.error(error);

        await delay(this.configuration.reconnectMsec);
        await this.initConnection();
      });
  }
}
