import { ConnectionManager, MessageBrokerProducer } from '@warden/message-broker-library';

export const TOKEN = 'MESSAGE_BROKER_PRODUCER';

export const messageBrokerProducer = {
  provide: TOKEN,
  useFactory: async () => {
    const connectionConfig = {
      connectionString: process.env.BROKER_CONNECTION_STRING!,
      maxReconnectAttempts: 3,
      reconnectMsec: +process.env.BROKER_RECONNECT_MSEC!,
    };

    const connectionManager = ConnectionManager.getInstance(connectionConfig);

    const messageBrokerProducer = new MessageBrokerProducer(
      {
        queue: process.env.BROKER_SIGNATURE_STATUS_QUEUE_NAME!,
      },
      connectionManager,
    );

    await messageBrokerProducer.initConnection();

    return messageBrokerProducer;
  },
};
