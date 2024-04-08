import { delay, logError } from '@warden/utils';

export abstract class Processor<T> {
  constructor(
    private keychainId: bigint,
    private generator: (keychainId: bigint) => AsyncGenerator<T, any, unknown>,
  ) {}

  async start(): Promise<void> {
    while (true) {
      try {
        for await (const request of this.generator(this.keychainId)) {
          let result = false;

          while (result !== true) {
            result = await this.handle(request);

            if (!result) await delay(1_000);
          }
        }
      } catch (error) {
        logError(error);

        await delay(5_000);
      }
    }
  }

  abstract handle(data: T): Promise<boolean>;
}
