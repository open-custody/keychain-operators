import { Type } from 'class-transformer';
import { IsNotEmpty, Matches, ValidateNested } from 'class-validator';

import { FORDEFI_NOTE_REGEX } from '../validation/regex.js';

export class WebhookBlackBoxSignatureStatusChangeEvent {
  /** The unique identifier of the object in the Fordefi platform. */
  transaction_id: string;
  /** @deprecated */
  is_managed_transaction: boolean;
  /** Indicates whether the transaction was initiated from the Fordefi system itself,
   * in contrast to incoming transactions (which are, for example, transfers of funds into a vault visible to Fordefi).
   */
  direction: string;
  /** An optional transaction note.
   * Used by keychain to write creator and request id.
   */
  @Matches(FORDEFI_NOTE_REGEX)
  @IsNotEmpty()
  note: string;
  /** automatically_set if the transaction was automatically set as spam by Fordefi,
   * manually_set if the transaction was manually set as spam by a user,
   * and unset if the transaction was not set as spam.
   */
  spam_state: string;
  /** The type of the transaction. */
  type: string;
  /** The current state of the message. */
  state: string;
}

export class FordefiWebhookEvent {
  webhook_id: string;
  /** The time of the webhook event creation in UTC. */
  created_at: Date;
  /** The unique ID of this event. */
  event_id: string;
  /** The attempt number of this event. */
  attempt: string;
  /** The time the current event was sent in UTC. */
  sent_at: Date;
  @ValidateNested()
  @Type(() => WebhookBlackBoxSignatureStatusChangeEvent)
  event: WebhookBlackBoxSignatureStatusChangeEvent;
  /** The type of the event. */
  event_type: string;
}
