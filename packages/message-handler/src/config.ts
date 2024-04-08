import { JSONSchemaType, envSchema } from 'env-schema';

import { Env } from './types/env';

const schema: JSONSchemaType<Env> = {
  type: 'object',
  required: [
    'WARDEN_RPC_URL',
    'WARDEN_POLLING_INTERVAL_MSEC',
    'WARDEN_CHAIN_PREFIX',
    'WARDEN_SIGNER_MNEMONIC',
    'WARDEN_SIGNER_GAS',
    'WARDEN_SIGNER_GAS_UWARD',
    'BROKER_CONNECTION_STRING',
    'BROKER_NEW_KEY_QUEUE_NAME',
    'BROKER_NEW_SIGNATURE_QUEUE_NAME',
    'BROKER_SIGNATURE_STATUS_QUEUE_NAME',
    'BROKER_RECONNECT_MSEC',
    'BROKER_QUEUE_PREFETCH',
    'BROKER_CONSUMER_RETRY_ATTEMPTS',
    'FORDEFI_ACCESS_TOKEN',
    'FORDEFI_CLIENT_PK',
    'FORDEFI_API_ENDPOINT',
    'FORDEFI_UUIDV5_NAMESPACE',
    'FORDEFI_API_USER_NAME',
  ],
  properties: {
    WARDEN_RPC_URL: {
      type: 'string',
    },
    WARDEN_POLLING_INTERVAL_MSEC: {
      type: 'number',
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
    WARDEN_SIGNER_GAS_UWARD: {
      type: 'number',
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
    BROKER_SIGNATURE_STATUS_QUEUE_NAME: {
      type: 'string',
    },
    BROKER_RECONNECT_MSEC: {
      type: 'number',
    },
    BROKER_QUEUE_PREFETCH: {
      type: 'number',
    },
    BROKER_CONSUMER_RETRY_ATTEMPTS: {
      type: 'number',
    },
    FORDEFI_ACCESS_TOKEN: {
      type: 'string',
    },
    FORDEFI_CLIENT_PK: {
      type: 'string',
    },
    FORDEFI_API_ENDPOINT: {
      type: 'string',
    },
    FORDEFI_UUIDV5_NAMESPACE: {
      type: 'string',
    },
    FORDEFI_API_USER_NAME: {
      type: 'string',
    },
  },
};

export const config = envSchema({
  schema,
  dotenv: true,
});
