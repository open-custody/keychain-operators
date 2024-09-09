export interface IWardenConfiguration {
  rpcURL: string;
  apiURL: string;
  prefix: string;
  chainId: string;
  pollingIntervalMsec: number;
  signerMnemonic: string;
  signerGas: string;
  signerGasUwardAmount: string;
  signerDerivationPath: string;
}
