import { Connection, connect } from 'amqplib';

import { IMessageBrokerConfiguration } from './types/configuration';

export class MessageBrokerConsumer {
  connection: Connection;

  constructor(private configuration: IMessageBrokerConfiguration) {}
}
