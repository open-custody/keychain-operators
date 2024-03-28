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
    private retryAttempts: number,
  ) {
    this.warden = warden;
  }

  async start(): Promise<void> {
    await this.consumer.consume<T>({ prefetch: this.prefetch }, async (message) => {
      let attempts = this.retryAttempts;

      while (attempts >= 0) {
        try {
          return await this.handle(message, attempts);
        } catch (error) {
          console.error(error);
        } finally {
          attempts--;
        }
      }
    });

    while (true) {
      await delay(10_000);
    }
  }

  abstract handle(data: T, attempts: number): Promise<boolean>;
}
