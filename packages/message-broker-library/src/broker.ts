import { logError } from '@warden/utils';
import { Channel, Connection } from 'amqplib';

import { ConnectionManager } from './connection.js';
import { IMessageBrokerConfiguration } from './types/configuration.js';

export abstract class MessageBroker {
  channel: Channel | null = null;
  configuration: IMessageBrokerConfiguration;
  private channelPromise: Promise<Channel> | null = null;

  constructor(
    configuration: IMessageBrokerConfiguration,
    private connectionManager: ConnectionManager,
  ) {
    this.configuration = configuration;
    this.setupConnectionListeners();
  }

  private setupConnectionListeners(): void {
    this.connectionManager.on('connectionClosed', () => {
      this.channel = null;
      this.channelPromise = null;
    });

    this.connectionManager.on('connectionEstablished', async (connection: Connection) => {
      if (!this.channel) {
        await this.initChannel(connection);
      }
    });
  }

  async initConnection(): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    await this.initChannel(connection);
  }

  private async initChannel(connection: Connection): Promise<void> {
    try {
      const channel = await connection.createChannel();

      channel.once('error', async (error) => {
        logError(`channel emitted 'error': ${error}`);
      });

      channel.once('close', async (error) => {
        logError(`channel emitted 'close': ${error}`);
      });

      this.channel = channel;
      await channel.assertQueue(this.configuration.queue, { durable: true });
    } catch (error) {
      logError(error);
      process.exit(1);
    }
  }

  protected async getChannel(): Promise<Channel> {
    if (this.channel) {
      return this.channel;
    }

    if (!this.channelPromise) {
      this.channelPromise = this.initConnection().then(() => this.channel!);
    }

    return this.channelPromise;
  }
}
