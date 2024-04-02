import { KeyProvider } from './keyProvider';

export interface INewSignatureRequestMessage {
  provider: KeyProvider;
  publicKey: string;
  requestId: string;
  keychainId: string;
  creator: string;
  signingData: string;
}
