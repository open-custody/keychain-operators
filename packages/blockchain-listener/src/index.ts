import { WardenService } from '@warden/blockchain-library';
import { KeyProvider, MessageBrokerProducer } from '@warden/message-broker-library';
import 'dotenv/config';

import { config } from './config';
import { NewKeyProcessor } from './processors/newKeyProcessor';
import { NewSignatureProcessor } from './processors/newSignatureProcessor';

export async function main(): Promise<void> {
  const warden = new WardenService({
    pollingIntervalMsec: config.WARDEN_POLLING_INTERVAL_MSEC,
    prefix: config.WARDEN_CHAIN_PREFIX,
    rpcURL: config.WARDEN_RPC_URL,
    signerMnemonic: config.WARDEN_SIGNER_MNEMONIC,
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
  await newKeyRequestProducer.initChannel();

  await newSignatureRequestProducer.initConnection();
  await newSignatureRequestProducer.initChannel();

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
  .catch(console.error)
  .finally(() => process.exit());
