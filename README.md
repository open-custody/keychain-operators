# Environment variables

## @warden/blockchain-listener

```bash
# example below

WARDEN_API_URL=http://127.0.0.1:1317
WARDEN_RPC_URL=http://127.0.0.1:26657
WARDEN_POLLING_INTERVAL_MSEC=5000
WARDEN_CHAIN_PREFIX=warden
WARDEN_SIGNER_MNEMONIC=test test test test test test test test test test test test test test test test test test test test test test test test
WARDEN_FORDEFI_KEYCHAIN_ID=3

BROKER_CONNECTION_STRING=amqps://user:password@host:5671
BROKER_NEW_KEY_QUEUE_NAME=warden-dev-new-key-request-id
BROKER_NEW_SIGNATURE_QUEUE_NAME=warden-dev-new-sig-request-id
BROKER_RECONNECT_MSEC=10000
BROKER_QUEUE_PREFETCH=1
```

## @warden/message-handler

```bash
# example below

WARDEN_API_URL=http://127.0.0.1:1317
WARDEN_RPC_URL=http://127.0.0.1:26657
WARDEN_POLLING_INTERVAL_MSEC=5000
WARDEN_CHAIN_PREFIX=warden
WARDEN_SIGNER_MNEMONIC=test test test test test test test test test test test test test test test test test test test test test test test test

BROKER_CONNECTION_STRING=amqps://user:password@host:5671
BROKER_NEW_KEY_QUEUE_NAME=warden-dev-new-key-request-id
BROKER_SIGNATURE_STATUS_QUEUE_NAME=warden-dev-signature-status
BROKER_RECONNECT_MSEC=10000
BROKER_QUEUE_PREFETCH=1
BROKER_CONSUMER_RETRY_ATTEMPTS=3

FORDEFI_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QiLCJpYXQiOjE1MTYyMzkwMjJ9.r2tIfSQyjfh-s0S3IXibZ5ftEeqK7_KfkXPuPBkfFm8
FORDEFI_CLIENT_PK=----BEGIN EC PRIVATE KEY-----MY_PRIVATE_KEY-----END EC PRIVATE KEY-----
FORDEFI_API_ENDPOINT=https://api.fordefi.com/api/v1/
FORDEFI_UUIDV5_NAMESPACE=1ebba8e2-97ff-5e44-9555-a5b557e96e0c
```

## @warden/webhooks

```bash
# example below

FORDEFI_PUBLIC_KEY='-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEQJ0NeDYQqqeCvgDofFsgtgaxk+dx\nybi63YGJwHz8Ebx7YQrmwNWnW3bG65E8wGHqZECjuaK2GKHbZx1EV2ws9A==\n-----END PUBLIC KEY-----'
WEBHOOK_PORT=3000
BROKER_CONNECTION_STRING=amqps://user:password@host:5671
BROKER_SIGNATURE_STATUS_QUEUE_NAME=warden-dev-signature-response
BROKER_RECONNECT_MSEC=10000
BROKER_QUEUE_PREFETCH=1
```
