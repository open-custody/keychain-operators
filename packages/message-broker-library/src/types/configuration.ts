export interface IMessageBrokerConfiguration {
  connectionString: string;
  queue: string;
  reconnectMsec: number;
}

export interface IMessageBrokerConsumerConfiguration {
  prefetch: number;
}
