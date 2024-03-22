import { Connection, Message, connect } from 'amqplib';

import { IMessageBrokerConfiguration } from './types/configuration';

export class MessageBrokerProducer {
  connection: Connection;

  constructor(private configuration: IMessageBrokerConfiguration) {}

  async connect(): Promise<void> {
    this.connection = await connect(this.configuration.connectionString);

    this.connection.on('error', function (error) {
      console.error(error);
      return setTimeout(connect, 5_000);
    });

    this.connection.on('close', function (error) {
      console.error(error);
      return setTimeout(connect, 5_000);
    });
  }

  async publish(): Promise<void> {
    this.connection.emit();
  }
}
