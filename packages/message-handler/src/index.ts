import { WardenService } from '@warden/blockchain-library';
import { FordefiService } from '@warden/fordefi-library';
import { KeyProvider, MessageBrokerConsumer } from '@warden/message-broker-library';
import 'dotenv/config';

import { FordefiKeychainHandler } from './keychains/fordefiKeychainHandler';
import { IKeychainHandler } from './keychains/keychainHandler';
import { NewKeyProcessor } from './processors/newKeyProcessor';
import { NewSignatureProcessor } from './processors/newSignatureProcessor';
import { SignatureStatusProcessor } from './processors/signatureStatusProcessor';

export async function main(): Promise<void> {
  const warden = new WardenService({
    pollingIntervalMsec: +process.env.WARDEN_POLLING_INTERVAL_MSEC,
    prefix: process.env.WARDEN_CHAIN_PREFIX,
    rpcURL: process.env.WARDEN_RPC_URL,
    signerMnemonic: process.env.WARDEN_SIGNER_MNEMONIC,
    signerGas: process.env.WARDEN_SIGNER_GAS,
    signerGasUwardAmount: process.env.WARDEN_SIGNER_GAS_UWARD,
  });

  const fordefi = new FordefiService({
    accessToken: process.env.FORDEFI_ACCESS_TOKEN,
    apiClientPrivateKey: process.env.FORDEFI_CLIENT_PK,
    fordefiAPIEndpoint: process.env.FORDEFI_API_ENDPOINT,
  });

  const newKeyRequestConsumer = new MessageBrokerConsumer({
    connectionString: process.env.BROKER_CONNECTION_STRING,
    queue: process.env.BROKER_NEW_KEY_QUEUE_NAME,
    reconnectMsec: +process.env.BROKER_RECONNECT_MSEC,
  });

  const newSignatureRequestConsumer = new MessageBrokerConsumer({
    connectionString: process.env.BROKER_CONNECTION_STRING,
    queue: process.env.BROKER_NEW_SIGNATURE_QUEUE_NAME,
    reconnectMsec: +process.env.BROKER_RECONNECT_MSEC,
  });

  const signatureStatusConsumer = new MessageBrokerConsumer({
    connectionString: process.env.BROKER_CONNECTION_STRING,
    queue: process.env.BROKER_SIGNATURE_STATUS_QUEUE_NAME,
    reconnectMsec: +process.env.BROKER_RECONNECT_MSEC,
  });

  await newKeyRequestConsumer.initConnection();
  await newSignatureRequestConsumer.initConnection();
  await signatureStatusConsumer.initConnection();

  const handlers = new Map<KeyProvider, IKeychainHandler>([
    [KeyProvider.Fordefi, new FordefiKeychainHandler(fordefi, process.env.FORDEFI_UUIDV5_NAMESPACE)],
  ]);

  const newFordefiKeyRequestProcess = new NewKeyProcessor(
    handlers,
    warden,
    newKeyRequestConsumer,
    +process.env.BROKER_QUEUE_PREFETCH,
    +process.env.BROKER_CONSUMER_RETRY_ATTEMPTS,
  ).start();

  const newFordefiSignatureRequestProcess = new NewSignatureProcessor(
    handlers,
    warden,
    newSignatureRequestConsumer,
    +process.env.BROKER_QUEUE_PREFETCH,
    +process.env.BROKER_CONSUMER_RETRY_ATTEMPTS,
  ).start();

  const newFordefiSignatureStatusProcess = new SignatureStatusProcessor(
    handlers,
    warden,
    signatureStatusConsumer,
    +process.env.BROKER_QUEUE_PREFETCH,
    +process.env.BROKER_CONSUMER_RETRY_ATTEMPTS,
  ).start();

  await Promise.all([newFordefiKeyRequestProcess, newFordefiSignatureRequestProcess, newFordefiSignatureStatusProcess]);
}

main()
  .catch(console.error)
  .finally(() => process.exit());
