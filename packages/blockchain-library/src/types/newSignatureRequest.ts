export interface INewSignatureRequest {
  id: string;
  keyId: string;
  keychainId: string;
  creator: string;
  signingData: string;
  keyType: 'KEY_TYPE_UNSPECIFIED' | 'KEY_TYPE_ECDSA_SECP256K1' | 'KEY_TYPE_EDDSA_ED25519';
}
