import { Inject, Injectable } from '@nestjs/common';
import { ISignatureStatusMessage, KeyProvider, MessageBrokerProducer } from '@warden/message-broker-library';
import { logInfo } from '@warden/utils';

import { TOKEN as messageProducerToken } from '../infrastructure/messageBroker.provider';
import { FordefiWebhookEvent } from '../models/fordefi.webhook.event';
import { FORDEFI_NOTE_REGEX } from '../validation/regex';

@Injectable()
export class FordefiWebhookService {
  constructor(@Inject(messageProducerToken) private producer: MessageBrokerProducer) {}

  async handle(event: FordefiWebhookEvent) {
    logInfo(`New transaction event: ${JSON.stringify(event)}`);

    const fordefiSignatureState = event.event.state;

    if (fordefiSignatureState !== ('completed' || 'aborted' || 'stuck' || 'canceled')) {
      return;
    }

    const [_, creator, requestId] = event.event.note.match(FORDEFI_NOTE_REGEX)!;

    await this.producer.publish<ISignatureStatusMessage>({
      creator,
      requestId: requestId,
      success: fordefiSignatureState === 'completed',
      reason: fordefiSignatureState,
      keyProviderRequestId: event.event.transaction_id,
      provider: KeyProvider.Fordefi,
    });

    logInfo(`Transaction event ${event.event_id} published`);
  }
}
