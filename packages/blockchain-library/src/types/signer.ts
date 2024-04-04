import { SigningStargateClient } from '@cosmjs/stargate';

export interface ISigner {
  client: SigningStargateClient;
  account: string;
}
