import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './controllers/fordefi.controller';
import { messageBrokerProvider } from './infrastructure/messageBroker.provider';
import { MessageProducerService } from './services/messageProducer.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [messageBrokerProvider, MessageProducerService],
})
export class AppModule {}
