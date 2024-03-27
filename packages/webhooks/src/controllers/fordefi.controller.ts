import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { SignatureGuard } from '../guards/signature.guard';
import { FordefiWebhookEvent } from '../models/fordefi.webhook.event';
import { AppService } from '../services/app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('/api/signature')
  @UseGuards(SignatureGuard)
  handleSignature(@Body() _fordefiWebhookEvent: FordefiWebhookEvent) {
    return this.appService.getHello();
  }
}
