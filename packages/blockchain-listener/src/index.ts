import { WardenService } from '@warden/blockchain-library';
import { ConnectionManager, KeyProvider, MessageBrokerProducer } from '@warden/message-broker-library';
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
    signerGas: config.WARDEN_SIGNER_GAS.toString(10),
    signerGasFeeAmount: config.WARDEN_SIGNER_GAS_FEE_AMOUNT.toString(10),
    signerFeeDenom: config.WARDEN_SIGNER_FEE_DENOM,
  });

  const connectionConfig = {
    connectionString: config.BROKER_CONNECTION_STRING,
    maxReconnectAttempts: config.BROKER_MAX_RECONNECT_ATTEMPTS,
    reconnectMsec: config.BROKER_RECONNECT_MSEC,
    errorEventResetPeriodMs: config.BROKER_ERROR_EVENT_RESET_PERIOD_MS,
  };

  const connectionManager = ConnectionManager.getInstance(connectionConfig);

  const newKeyRequestProducer = new MessageBrokerProducer(
    {
      queue: config.BROKER_NEW_KEY_QUEUE_NAME,
    },
    connectionManager,
    'newKeyRequestProducer',
  );

  const newSignatureRequestProducer = new MessageBrokerProducer(
    {
      queue: config.BROKER_NEW_SIGNATURE_QUEUE_NAME,
    },
    connectionManager,
    'newSignatureRequestProducer',
  );

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
