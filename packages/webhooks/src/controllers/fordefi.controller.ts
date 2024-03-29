import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IFulfilSignatureRequestMessage } from '@warden/message-broker-library';
import { FulfilmentStatus } from '@warden/message-broker-library/dist/types/fulfilmentStatus';

import { SignatureGuard } from '../guards/signature.guard';
import { FordefiWebhookEvent } from '../models/fordefi.webhook.event';
import { MessageProducerService } from '../services/messageProducer.service';
import { FORDEFI_NOTE_REGEX } from '../validation/regex';

@Controller()
export class AppController {
  constructor(private readonly producerService: MessageProducerService) {}

  @Post('/fordefi/signature')
  @UseGuards(SignatureGuard)
  handleSignature(@Body() fordefiWebhookEvent: FordefiWebhookEvent) {
    const fordefiSignatureState = fordefiWebhookEvent.event.state;
    if (fordefiSignatureState === ('completed' || 'aborted')) {
      const [_, creator, requestId] = fordefiWebhookEvent.event.note.match(FORDEFI_NOTE_REGEX);

      return this.producerService.produce<IFulfilSignatureRequestMessage>({
        creator,
        requestId: parseInt(requestId),
        status: fordefiSignatureState === 'completed' ? FulfilmentStatus.Fulfil : FulfilmentStatus.Reject,
        keyProviderRequestId: fordefiWebhookEvent.event.transaction_id,
      });
    }

    return false;
  }
}
