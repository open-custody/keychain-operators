import { Connection, connect } from 'amqplib';

import { IMessageBrokerConfiguration } from './types/configuration';

export abstract class MessageBroker {
  connection: Connection;

  constructor(private configuration: IMessageBrokerConfiguration) {}

  async connect(): Promise<Connection> {
    this.connection = await connect(this.configuration.connectionString)
      .then((connection) => {
        connection.once('error', function (error) {
          console.error(error);
          setTimeout(connect, 5_000);
        });

        connection.once('close', function (error) {
          console.error(error);
          setTimeout(connect, 5_000);
        });

        return connection;
      })
      .catch(async (error) => {
        console.error(error);

        setTimeout(connect, 5_000);
      });

    const channel = await this.connection.createChannel();

    channel.recover();

    return this.connection;
  }
}
