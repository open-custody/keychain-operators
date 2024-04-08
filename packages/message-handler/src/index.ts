import { WardenService } from '@warden/blockchain-library';
import { FordefiService } from '@warden/fordefi-library';
import { KeyProvider, MessageBrokerConsumer } from '@warden/message-broker-library';
import 'dotenv/config';

import { config } from './config';
import { FordefiKeychainHandler } from './keychains/fordefiKeychainHandler';
import { IKeychainHandler } from './keychains/keychainHandler';
import { NewKeyProcessor } from './processors/newKeyProcessor';
import { NewSignatureProcessor } from './processors/newSignatureProcessor';
import { SignatureStatusProcessor } from './processors/signatureStatusProcessor';

export async function main(): Promise<void> {
  const warden = new WardenService({
    pollingIntervalMsec: config.WARDEN_POLLING_INTERVAL_MSEC,
    prefix: config.WARDEN_CHAIN_PREFIX,
    rpcURL: config.WARDEN_RPC_URL,
    signerMnemonic: config.WARDEN_SIGNER_MNEMONIC,
    signerGas: config.WARDEN_SIGNER_GAS.toString(10),
    signerGasUwardAmount: config.WARDEN_SIGNER_GAS_UWARD.toString(10),
  });

  const fordefi = new FordefiService({
    accessToken: config.FORDEFI_ACCESS_TOKEN,
    apiClientPrivateKey: config.FORDEFI_CLIENT_PK,
    fordefiAPIEndpoint: config.FORDEFI_API_ENDPOINT,
  });

  const newKeyRequestConsumer = new MessageBrokerConsumer({
    connectionString: config.BROKER_CONNECTION_STRING,
    queue: config.BROKER_NEW_KEY_QUEUE_NAME,
    reconnectMsec: config.BROKER_RECONNECT_MSEC,
  });

  const newSignatureRequestConsumer = new MessageBrokerConsumer({
    connectionString: config.BROKER_CONNECTION_STRING,
    queue: config.BROKER_NEW_SIGNATURE_QUEUE_NAME,
    reconnectMsec: config.BROKER_RECONNECT_MSEC,
  });

  const signatureStatusConsumer = new MessageBrokerConsumer({
    connectionString: config.BROKER_CONNECTION_STRING,
    queue: config.BROKER_SIGNATURE_STATUS_QUEUE_NAME,
    reconnectMsec: config.BROKER_RECONNECT_MSEC,
  });

  await newKeyRequestConsumer.initConnection();
  await newSignatureRequestConsumer.initConnection();
  await signatureStatusConsumer.initConnection();

  const handlers = new Map<KeyProvider, IKeychainHandler>([
    [
      KeyProvider.Fordefi,
      new FordefiKeychainHandler(fordefi, config.FORDEFI_UUIDV5_NAMESPACE, config.FORDEFI_API_USER_NAME),
    ],
  ]);

  const newFordefiKeyRequestProcess = new NewKeyProcessor(
    handlers,
    warden,
    newKeyRequestConsumer,
    config.BROKER_QUEUE_PREFETCH,
    config.BROKER_CONSUMER_RETRY_ATTEMPTS,
  ).start();

  const newFordefiSignatureRequestProcess = new NewSignatureProcessor(
    handlers,
    warden,
    newSignatureRequestConsumer,
    config.BROKER_QUEUE_PREFETCH,
    config.BROKER_CONSUMER_RETRY_ATTEMPTS,
  ).start();

  const newFordefiSignatureStatusProcess = new SignatureStatusProcessor(
    handlers,
    warden,
    signatureStatusConsumer,
    config.BROKER_QUEUE_PREFETCH,
    config.BROKER_CONSUMER_RETRY_ATTEMPTS,
  ).start();

  await Promise.all([newFordefiKeyRequestProcess, newFordefiSignatureRequestProcess, newFordefiSignatureStatusProcess]);
}

main()
  .catch(console.error)
  .finally(() => process.exit());
