import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './controllers/fordefi.controller.js';
import { messageBrokerProducer } from './infrastructure/messageBroker.provider.js';
import { FordefiWebhookService } from './services/fordefiWebhook.service.js';
import { validate } from './validation/env.validation.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
  ],
  controllers: [AppController],
  providers: [messageBrokerProducer, FordefiWebhookService],
})
export class AppModule {}
