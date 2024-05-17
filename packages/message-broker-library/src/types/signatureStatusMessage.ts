import { KeyProvider } from './keyProvider.js';

export interface ISignatureStatusMessage {
  creator: string;
  requestId: string;
  success: boolean;
  reason: string;
  keyProviderRequestId: string;
  provider: KeyProvider;
}
