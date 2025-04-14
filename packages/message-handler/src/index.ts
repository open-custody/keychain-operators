import { WardenService } from '@warden/blockchain-library';
import { FordefiService } from '@warden/fordefi-library';
import { KeyProvider, MessageBrokerConsumer } from '@warden/message-broker-library';
import { logError } from '@warden/utils';
import 'dotenv/config';

import { config } from './config.js';
import { FordefiKeychainHandler } from './keychains/fordefiKeychainHandler.js';
import { IKeychainHandler } from './keychains/keychainHandler.js';
import { NewKeyProcessor } from './processors/newKeyProcessor.js';
import { NewSignatureProcessor } from './processors/newSignatureProcessor.js';
import { SignatureStatusProcessor } from './processors/signatureStatusProcessor.js';

export async function main(): Promise<void> {
  const warden = new WardenService({
    pollingIntervalMsec: config.WARDEN_POLLING_INTERVAL_MSEC,
    chainId: config.WARDEN_CHAIN_ID,
    prefix: config.WARDEN_CHAIN_PREFIX,
    rpcURL: config.WARDEN_RPC_URL,
    apiURL: config.WARDEN_API_URL,
    signerMnemonic: config.WARDEN_SIGNER_MNEMONIC,
    signerGas: config.WARDEN_SIGNER_GAS.toString(10),
    signerGasFeeAmount: config.WARDEN_SIGNER_GAS_FEE_AMOUNT.toString(10),
    signerFeeDenom: config.WARDEN_SIGNER_FEE_DENOM,
  });

  const fordefi = new FordefiService({
    accessToken: config.FORDEFI_ACCESS_TOKEN,
    fordefiAPIEndpoint: config.FORDEFI_API_ENDPOINT,
    awsKmsRegion: config.AWS_KMS_REGION,
    awsKmsKeyId: config.AWS_KMS_FORDEFI_CLIENT_PK_KEY_ID,
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
  .catch((e) => logError(e))
  .finally(() => process.exit());
