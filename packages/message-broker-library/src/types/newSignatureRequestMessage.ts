import { KeyProvider } from './keyProvider.js';

export interface INewSignatureRequestMessage {
  provider: KeyProvider;
  requestId: string;
  publicKey: string;
  keychainId: string;
  creator: string;
  signingData: string;
}
