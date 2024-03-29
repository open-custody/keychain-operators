import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { SignatureGuard } from '../guards/signature.guard';
import { FordefiWebhookEvent } from '../models/fordefi.webhook.event';
import { FordefiWebhookService } from '../services/fordefiWebhook.service';

@Controller()
export class AppController {
  constructor(private readonly fordefiWebhookService: FordefiWebhookService) {}

  @Post('/fordefi/signature')
  @UseGuards(SignatureGuard)
  async handleFordefiSignature(@Body() fordefiWebhookEvent: FordefiWebhookEvent) {
    await this.fordefiWebhookService.handle(fordefiWebhookEvent);
  }
}
