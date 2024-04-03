import { KeyProvider } from './keyProvider';

export interface ISignatureStatusMessage {
  creator: string;
  requestId: number;
  success: boolean;
  reason: string;
  keyProviderRequestId: string;
  provider: KeyProvider;
}
