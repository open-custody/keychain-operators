import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { ApiUserGuard } from '../guards/apiUser.guard.js';
import { SignatureGuard } from '../guards/signature.guard.js';
import { FordefiWebhookEvent } from '../models/fordefi.webhook.event.js';
import { FordefiWebhookService } from '../services/fordefiWebhook.service.js';

@Controller()
export class AppController {
  constructor(private readonly fordefiWebhookService: FordefiWebhookService) {}

  @Post('/fordefi/signature')
  @UseGuards(SignatureGuard, ApiUserGuard)
  async handleFordefiSignature(@Body() fordefiWebhookEvent: FordefiWebhookEvent) {
    await this.fordefiWebhookService.handle(fordefiWebhookEvent);
  }
}
