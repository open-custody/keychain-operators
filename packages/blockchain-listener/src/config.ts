import { JSONSchemaType, envSchema } from 'env-schema';

import { Env } from './env.js';

const schema: JSONSchemaType<Env> = {
  type: 'object',
  required: [
    'WARDEN_RPC_URL',
    'WARDEN_API_URL',
    'WARDEN_POLLING_INTERVAL_MSEC',
    'WARDEN_CHAIN_ID',
    'WARDEN_CHAIN_PREFIX',
    'WARDEN_SIGNER_MNEMONIC',
    'WARDEN_SIGNER_GAS',
    'WARDEN_SIGNER_GAS_FEE_AMOUNT',
    'WARDEN_FORDEFI_KEYCHAIN_ID',
    'BROKER_CONNECTION_STRING',
    'BROKER_NEW_KEY_QUEUE_NAME',
    'BROKER_NEW_SIGNATURE_QUEUE_NAME',
    'BROKER_RECONNECT_MSEC',
    'BROKER_QUEUE_PREFETCH',
    'BROKER_MAX_RECONNECT_ATTEMPTS',
    'BROKER_ERROR_EVENT_RESET_PERIOD_MS',
  ],
  properties: {
    WARDEN_RPC_URL: {
      type: 'string',
    },
    WARDEN_API_URL: {
      type: 'string',
    },
    WARDEN_POLLING_INTERVAL_MSEC: {
      type: 'number',
    },
    WARDEN_CHAIN_ID: {
      type: 'string',
    },
    WARDEN_CHAIN_PREFIX: {
      type: 'string',
    },
    WARDEN_SIGNER_MNEMONIC: {
      type: 'string',
    },
    WARDEN_SIGNER_GAS: {
      type: 'number',
    },
    WARDEN_SIGNER_GAS_FEE_AMOUNT: {
      type: 'number',
    },
    WARDEN_SIGNER_FEE_DENOM: {
      type: 'string',
    },
    WARDEN_FORDEFI_KEYCHAIN_ID: {
      type: 'string',
    },
    BROKER_CONNECTION_STRING: {
      type: 'string',
    },
    BROKER_NEW_KEY_QUEUE_NAME: {
      type: 'string',
    },
    BROKER_NEW_SIGNATURE_QUEUE_NAME: {
      type: 'string',
    },
    BROKER_RECONNECT_MSEC: {
      type: 'number',
    },
    BROKER_QUEUE_PREFETCH: {
      type: 'number',
    },
    BROKER_MAX_RECONNECT_ATTEMPTS: {
      type: 'number',
    },
    BROKER_ERROR_EVENT_RESET_PERIOD_MS: {
      type: 'number',
    },
  },
};

export const config = envSchema({
  schema,
  dotenv: true,
});
