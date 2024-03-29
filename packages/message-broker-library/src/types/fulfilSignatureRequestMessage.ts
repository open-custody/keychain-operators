import { FulfilmentStatus } from './fulfilmentStatus';

export interface IFulfilSignatureRequestMessage {
  creator: string;
  requestId: number;
  status: FulfilmentStatus;
  keyProviderRequestId?: string;
}
