import { INewKeyRequestMessage } from '@warden/message-broker-library';

export interface IKeychainHandler {
  createKey(data: INewKeyRequestMessage): Promise<Buffer>;
}
