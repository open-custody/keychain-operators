import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  console.log('Started at', process.env.WEBHOOK_PORT);
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(process.env.WEBHOOK_PORT);
}

bootstrap().catch(console.error);