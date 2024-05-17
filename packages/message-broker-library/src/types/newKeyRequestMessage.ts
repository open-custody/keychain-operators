import { KeyProvider } from './keyProvider.js';

export interface INewKeyRequestMessage {
  provider: KeyProvider;
  requestId: string;
  keychainId: string;
  spaceId: string;
  creator: string;
}
