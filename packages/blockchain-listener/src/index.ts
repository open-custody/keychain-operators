import { WardenService } from '@warden/blockchain-library';
import { KeyProvider, MessageBrokerProducer } from '@warden/message-broker-library';
import 'dotenv/config';

import { NewKeyProcessor } from './processors/newKeyProcessor';

export async function main(): Promise<void> {
  const warden = new WardenService({
    apiURL: process.env.WARDEN_API_URL,
    pollingIntervalMsec: +process.env.WARDEN_POLLING_INTERVAL_MSEC,
    prefix: process.env.WARDEN_CHAIN_PREFIX,
    rpcURL: process.env.WARDEN_RPC_URL,
    signerMnemonic: process.env.WARDEN_SIGNER_MNEMONIC,
  });

  const newKeyRequestProducer = new MessageBrokerProducer({
    connectionString: process.env.BROKER_CONNECTION_STRING,
    queue: process.env.BROKER_NEW_KEY_QUEUE_NAME,
    reconnectMsec: +process.env.BROKER_RECONNECT_MSEC,
  });

  await newKeyRequestProducer.initConnection();
  await newKeyRequestProducer.initChannel();

  const newFordefiKeyRequestProcess = new NewKeyProcessor(
    warden.pollPendingKeyRequests(process.env.WARDEN_FORDEFI_KEYCHAIN_ID),
    newKeyRequestProducer,
    KeyProvider.Fordefi,
  ).start();

  await Promise.all([newFordefiKeyRequestProcess]);
}

main()
  .catch(console.error)
  .finally(() => process.exit());
