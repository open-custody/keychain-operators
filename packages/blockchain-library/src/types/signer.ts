import { HDNodeWallet } from 'ethers';

export interface ISigner {
  wallet: HDNodeWallet;
  account: string;
  signerPubKey: Uint8Array;
}
