import { logError, logInfo } from '@warden/utils';
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
    private tag: string,
  ) {
    this.configuration = configuration;
    this.setupConnectionListeners();
  }

  private setupConnectionListeners(): void {
    this.connectionManager.on('connectionClosed', async () => {
      this.channel = null;
      this.channelPromise = null;
      await this.onConnectionClosed();
    });

    this.connectionManager.on('connectionEstablished', async (connection: Connection) => {
      if (!this.channel && !this.channelPromise) {
        await this.initChannel(connection);
      }
      await this.onConnectionEstablished();
    });
  }

  private async initConnection(): Promise<void> {
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
      logInfo(`${this.tag}: broker channel established`);
      await channel.assertQueue(this.configuration.queue, { durable: true, arguments: { 'x-queue-type': 'quorum' } });
      logInfo(`${this.tag}: queue ${this.configuration.queue} asserted`);
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

    return this.channelPromise!;
  }

  protected async onConnectionClosed(): Promise<void> {
    // To be implemented by subclasses
  }

  protected async onConnectionEstablished(): Promise<void> {
    // To be implemented by subclasses
  }
}
