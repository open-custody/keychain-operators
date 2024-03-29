import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './controllers/fordefi.controller';
import { messageBrokerProducer } from './infrastructure/messageBroker.provider';
import { MessageProducerService } from './services/messageProducer.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [messageBrokerProducer, MessageProducerService],
})
export class AppModule {}
