import { INewKeyRequestMessage, INewSignatureRequestMessage } from '@warden/message-broker-library';

import { ISignatureResult } from '../types/signResult';

export interface IKeychainHandler {
  createKey(data: INewKeyRequestMessage): Promise<Buffer>;

  sign(data: INewSignatureRequestMessage): Promise<ISignatureResult>;
}
