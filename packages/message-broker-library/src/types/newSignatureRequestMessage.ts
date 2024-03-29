import { KeyProvider } from './keyProvider';

export interface INewSignatureRequestMessage {
  provider: KeyProvider;
  requestId: string;
  keyId: string;
  keychainId: string;
  creator: string;
  signingData: string;
  keyType: 'KEY_TYPE_UNSPECIFIED' | 'KEY_TYPE_ECDSA_SECP256K1' | 'KEY_TYPE_EDDSA_ED25519';
}
