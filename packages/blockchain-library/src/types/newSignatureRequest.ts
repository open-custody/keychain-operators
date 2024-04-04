export interface INewSignatureRequest {
  id: bigint;
  publicKey: Uint8Array;
  keychainId: bigint;
  creator: string;
  signingData: Uint8Array;
}
