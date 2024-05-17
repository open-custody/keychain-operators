import { delay, logError } from '@warden/utils';
import { Channel, Connection, connect } from 'amqplib';

import { IMessageBrokerConfiguration } from './types/configuration.js';

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
          logError(error);

          await connection.close().catch((e) => logError(e));
        });

        connection.once('close', async (error) => {
          logError(error);

          await delay(this.configuration.reconnectMsec);
          await this.initConnection();
        });

        this.connection = connection;
      })
      .then(async (_) => await this.initChannel())
      .catch(async (error) => {
        logError(error);

        await delay(this.configuration.reconnectMsec);
        await this.initConnection();
      });
  }

  async initChannel(): Promise<void> {
    await this.connection
      .createChannel()
      .then(async (channel) => {
        channel.once('error', async (error) => {
          logError(error);

          await channel.close().catch((e) => logError(e));
        });

        channel.once('close', async (error) => {
          logError(error);

          await delay(this.configuration.reconnectMsec);
          await this.initConnection();
        });

        this.channel = channel;

        await channel.assertQueue(this.configuration.queue, { durable: true });
      })
      .catch(async (error) => {
        logError(error);

        await delay(this.configuration.reconnectMsec);
        await this.initConnection();
      });
  }
}
