import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './controllers/fordefi.controller';
import { messageBrokerProducer } from './infrastructure/messageBroker.provider';
import { FordefiWebhookService } from './services/fordefiWebhook.service';
import { validate } from './validation/env.validation';

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
