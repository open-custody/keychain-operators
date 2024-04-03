import { Inject, Injectable } from '@nestjs/common';
import { ISignatureStatusMessage, KeyProvider, MessageBrokerProducer } from '@warden/message-broker-library';

import { TOKEN as messageProducerToken } from '../infrastructure/messageBroker.provider';
import { FordefiWebhookEvent } from '../models/fordefi.webhook.event';
import { FORDEFI_NOTE_REGEX } from '../validation/regex';

@Injectable()
export class FordefiWebhookService {
  constructor(@Inject(messageProducerToken) private producer: MessageBrokerProducer) {}

  async handle(fordefiWebhookEvent: FordefiWebhookEvent) {
    const fordefiSignatureState = fordefiWebhookEvent.event.state;

    if (fordefiSignatureState !== ('completed' || 'aborted' || 'stuck' || 'canceled')) {
      return;
    }

    const [_, creator, requestId] = fordefiWebhookEvent.event.note.match(FORDEFI_NOTE_REGEX);

    await this.producer.publish<ISignatureStatusMessage>({
      creator,
      requestId: requestId,
      success: fordefiSignatureState === 'completed',
      reason: fordefiSignatureState,
      keyProviderRequestId: fordefiWebhookEvent.event.transaction_id,
      provider: KeyProvider.Fordefi,
    });
  }
}
