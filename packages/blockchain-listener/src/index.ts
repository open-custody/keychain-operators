import { WardenService } from '@warden/blockchain-library';
import { KeyProvider, MessageBrokerProducer } from '@warden/message-broker-library';
import { logError } from '@warden/utils';
import 'dotenv/config';

import { config } from './config.js';
import { NewKeyProcessor } from './processors/newKeyProcessor.js';
import { NewSignatureProcessor } from './processors/newSignatureProcessor.js';

export async function main(): Promise<void> {
  const warden = new WardenService({
    pollingIntervalMsec: config.WARDEN_POLLING_INTERVAL_MSEC,
    chainId: config.WARDEN_CHAIN_ID,
    prefix: config.WARDEN_CHAIN_PREFIX,
    rpcURL: config.WARDEN_RPC_URL,
    apiURL: config.WARDEN_API_URL,
    signerMnemonic: config.WARDEN_SIGNER_MNEMONIC,
    signerDerivationPath: config.WARDEN_SIGNER_DERIVATION_PATH,
    signerGas: config.WARDEN_SIGNER_GAS.toString(10),
    signerGasUwardAmount: config.WARDEN_SIGNER_GAS_UWARD.toString(10),
  });

  const newKeyRequestProducer = new MessageBrokerProducer({
    connectionString: config.BROKER_CONNECTION_STRING,
    queue: config.BROKER_NEW_KEY_QUEUE_NAME,
    reconnectMsec: config.BROKER_RECONNECT_MSEC,
  });

  const newSignatureRequestProducer = new MessageBrokerProducer({
    connectionString: config.BROKER_CONNECTION_STRING,
    queue: config.BROKER_NEW_SIGNATURE_QUEUE_NAME,
    reconnectMsec: config.BROKER_RECONNECT_MSEC,
  });

  await newKeyRequestProducer.initConnection();
  await newSignatureRequestProducer.initConnection();

  const newFordefiKeyRequestProcess = new NewKeyProcessor(
    BigInt(config.WARDEN_FORDEFI_KEYCHAIN_ID),
    warden.pollPendingKeyRequests.bind(warden),
    newKeyRequestProducer,
    KeyProvider.Fordefi,
  ).start();

  const newFordefiSignatureRequestProcess = new NewSignatureProcessor(
    BigInt(config.WARDEN_FORDEFI_KEYCHAIN_ID),
    warden.pollPendingSignatureRequests.bind(warden),
    newSignatureRequestProducer,
    KeyProvider.Fordefi,
  ).start();

  await Promise.all([newFordefiKeyRequestProcess, newFordefiSignatureRequestProcess]);
}

main()
  .catch((e) => logError(e))
  .finally(() => process.exit());
