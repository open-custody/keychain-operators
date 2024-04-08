import { MessageBrokerProducer } from '@warden/message-broker-library';

export const TOKEN = 'MESSAGE_BROKER_PRODUCER';

export const messageBrokerProducer = {
  provide: TOKEN,
  useFactory: async () => {
    const messageBrokerProducer = new MessageBrokerProducer({
      connectionString: process.env.BROKER_CONNECTION_STRING!,
      queue: process.env.BROKER_SIGNATURE_STATUS_QUEUE_NAME!,
      reconnectMsec: +process.env.BROKER_RECONNECT_MSEC!,
    });

    await messageBrokerProducer.initConnection();

    return messageBrokerProducer;
  },
};
