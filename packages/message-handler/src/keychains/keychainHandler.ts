import { INewKeyRequestMessage, INewSignatureRequestMessage } from '@warden/message-broker-library';

export interface IKeychainHandler {
  createKey(data: INewKeyRequestMessage): Promise<Buffer>;

  sign(data: INewSignatureRequestMessage): Promise<Buffer>;
}
