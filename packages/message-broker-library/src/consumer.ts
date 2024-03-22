import { Connection, connect } from 'amqplib';

import { MessageBroker } from './broker';
import { IMessageBrokerConfiguration } from './types/configuration';

export class MessageBrokerConsumer extends MessageBroker {}
