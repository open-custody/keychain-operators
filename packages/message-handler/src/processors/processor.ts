import { WardenService } from '@warden/blockchain-library';
import { MessageBrokerConsumer } from '@warden/message-broker-library';
import { promisify } from 'util';

const delay = promisify((ms: number, res: () => void) => setTimeout(res, ms));

export abstract class Processor<T> {
  warden: WardenService;

  constructor(
    warden: WardenService,
    private consumer: MessageBrokerConsumer,
    private prefetch: number,
  ) {
    this.warden = warden;
  }

  async start(): Promise<void> {
    await this.consumer.consume<T>({ prefetch: this.prefetch }, async (message) => await this.handle(message));

    while (true) {
      await delay(1000);
    }
  }

  abstract handle(data: T): Promise<boolean>;
}
