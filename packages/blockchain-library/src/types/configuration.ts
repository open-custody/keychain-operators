export interface IWardenConfiguration {
  apiURL: string;
  rpcURL: string;
  prefix: string;
  pollingIntervalMsec: number;
  keychainId: string;
  signerMnemonic: string;
  chainPrefix: string;
}
