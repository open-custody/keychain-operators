import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { logError, logInfo } from '@warden/utils';

import { AppModule } from './app.module';

async function bootstrap() {
  logInfo(`Started at ${process.env.WEBHOOK_PORT}`);
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(process.env.WEBHOOK_PORT!);
}

bootstrap().catch((e) => logError(e));
