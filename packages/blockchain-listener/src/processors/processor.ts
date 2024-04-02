import { delay } from '@warden/utils';

export abstract class Processor<T> {
  constructor(private generator: AsyncGenerator<T>) {}

  async start(): Promise<void> {
    while (true) {
      try {
        for await (const request of this.generator) {
          let result: boolean;

          while (result !== true) {
            result = await this.handle(request);

            if (!result) await delay(1_000);
          }
        }
      } catch (error) {
        console.error(error);

        await delay(5_000);
      }
    }
  }

  abstract handle(data: T): Promise<boolean>;
}
