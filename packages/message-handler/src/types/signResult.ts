export interface ISignatureResult {
  signature?: Buffer;
  status: SignatureResultStatus;
  reason?: string;
}

export enum SignatureResultStatus {
  Pending = 1,
  Success,
  Failed,
}
