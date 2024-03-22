import { Connection, Message, connect } from 'amqplib';

import { IMessageBrokerConfiguration } from './types/configuration';

export class MessageBrokerProducer extends MessageBroker {
  async publish(): Promise<void> {
    super.connection.emit();
  }
}
