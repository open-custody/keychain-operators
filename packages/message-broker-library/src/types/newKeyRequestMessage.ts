import { KeyProvider } from './keyProvider';

export interface INewKeyRequestMessage {
  provider: KeyProvider;
  requestId: string;
  keychainId: string;
  spaceId: string;
  creator: string;
}
