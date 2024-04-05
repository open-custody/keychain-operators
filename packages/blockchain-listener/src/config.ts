import { JSONSchemaType, envSchema } from 'env-schema';

import { Env } from './env';

const schema: JSONSchemaType<Env> = {
  type: 'object',
  required: [
    'WARDEN_RPC_URL',
    'WARDEN_POLLING_INTERVAL_MSEC',
    'WARDEN_CHAIN_PREFIX',
    'WARDEN_SIGNER_MNEMONIC',
    'WARDEN_SIGNER_GAS',
    'WARDEN_SIGNER_GAS_UWARD',
    'WARDEN_FORDEFI_KEYCHAIN_ID',
    'BROKER_CONNECTION_STRING',
    'BROKER_NEW_KEY_QUEUE_NAME',
    'BROKER_NEW_SIGNATURE_QUEUE_NAME',
    'BROKER_RECONNECT_MSEC',
    'BROKER_QUEUE_PREFETCH',
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
  },
};

export const config = envSchema({
  schema,
  dotenv: true,
});
