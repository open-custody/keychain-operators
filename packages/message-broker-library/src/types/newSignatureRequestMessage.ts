import { KeyProvider } from './keyProvider';

export interface INewSignatureRequestMessage {
  provider: KeyProvider;
  requestId: string;
  publicKey: string;
  keychainId: string;
  creator: string;
  signingData: string;
}
