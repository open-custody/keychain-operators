import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { ApiUserGuard } from '../guards/apiUser.guard';
import { SignatureGuard } from '../guards/signature.guard';
import { FordefiWebhookEvent } from '../models/fordefi.webhook.event';
import { FordefiWebhookService } from '../services/fordefiWebhook.service';

@Controller()
export class AppController {
  constructor(private readonly fordefiWebhookService: FordefiWebhookService) {}

  @Post('/fordefi/signature')
  @UseGuards(SignatureGuard)
  @UseGuards(ApiUserGuard)
  async handleFordefiSignature(@Body() fordefiWebhookEvent: FordefiWebhookEvent) {
    await this.fordefiWebhookService.handle(fordefiWebhookEvent);
  }
}
