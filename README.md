# Environment variables

## @warden/blockchain-listener

```bash
# example below

WARDEN_RPC_URL=http://127.0.0.1:26657
WARDEN_POLLING_INTERVAL_MSEC=5000
WARDEN_CHAIN_PREFIX=warden
WARDEN_SIGNER_MNEMONIC=test test test test test test test test test test test test test test test test test test test test test test test test
WARDEN_SIGNER_GAS=400000
WARDEN_SIGNER_GAS_UWARD=500
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

WARDEN_RPC_URL=http://127.0.0.1:26657
WARDEN_POLLING_INTERVAL_MSEC=5000
WARDEN_CHAIN_PREFIX=warden
WARDEN_SIGNER_MNEMONIC=test test test test test test test test test test test test test test test test test test test test test test test test
WARDEN_SIGNER_GAS=400000
WARDEN_SIGNER_GAS_UWARD=500

BROKER_CONNECTION_STRING=amqps://user:password@host:5671
BROKER_NEW_KEY_QUEUE_NAME=warden-dev-new-key-request-id
BROKER_NEW_SIGNATURE_QUEUE_NAME=warden-dev-new-sig-request-id
BROKER_SIGNATURE_STATUS_QUEUE_NAME=warden-dev-signature-status
BROKER_RECONNECT_MSEC=10000
BROKER_QUEUE_PREFETCH=1
BROKER_CONSUMER_RETRY_ATTEMPTS=3

FORDEFI_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QiLCJpYXQiOjE1MTYyMzkwMjJ9.r2tIfSQyjfh-s0S3IXibZ5ftEeqK7_KfkXPuPBkfFm8
AWS_KMS_REGION=eu-west-1
AWS_KMS_FORDEFI_CLIENT_PK_KEY_ID=KEY_ID
FORDEFI_API_ENDPOINT=https://api.fordefi.com/api/v1/
FORDEFI_UUIDV5_NAMESPACE=1ebba8e2-97ff-5e44-9555-a5b557e96e0c
FORDEFI_API_USER_NAME=api-user-name
```

## @warden/webhooks

```bash
# example below

FORDEFI_PUBLIC_KEY='-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEQJ0NeDYQqqeCvgDofFsgtgaxk+dx\nybi63YGJwHz8Ebx7YQrmwNWnW3bG65E8wGHqZECjuaK2GKHbZx1EV2ws9A==\n-----END PUBLIC KEY-----'
WEBHOOK_PORT=3000
BROKER_CONNECTION_STRING=amqps://user:password@host:5671
BROKER_SIGNATURE_STATUS_QUEUE_NAME=warden-dev-signature-status
BROKER_RECONNECT_MSEC=10000
BROKER_QUEUE_PREFETCH=1
FORDEFI_API_USER_NAME=api-user-name
```

# Deployment

Before deploying a new keychain operator, the corresponding keychain must be created in Warden blockchain.

1. Create keychain itself

   `wardend tx warden new-keychain --description 'Keychain name' --from <KEYCHAIN_ADMIN_ACCOUNT> --chain-id wardenprotocol --node <RPC_URL>`

2. Ensure the keychain has been created and export the keychain id to the KEYCHAIN_ID variable.

   ```
   wardend query warden keychains
     description: "Keychain name"
     id: "2"
     ...

   export KEYCHAIN_ID=2  # replace with the actual keychain ID
   ```

3. Account can be generated localy or created in wallet. Make sure to save the mnemonic of the created key as it will be
   used in environment variables of the backend services. Example for generating localy:
   ```
   export KEYCHAIN_PARTY_NAME=my-keychain-party
   wardend keys add $KEYCHAIN_PARTY_NAME
   export KEYCHAIN_PARTY=$(wardend keys show -a $KEYCHAIN_PARTY_NAME)
   ```
4. Add the newly created keychain party to the keychain. It will be used by keychain operator to sign transactions.

   `wardend tx warden add-keychain-party --keychain-id $KEYCHAIN_ID --party $KEYCHAIN_PARTY --from <KEYCHAIN_ADMIN_ACCOUNT> --chain-id wardenprotocol`

5. Top up the keychain party with WARD tokens.
   `wardend tx bank send <FROM_ACCOUNT> <KEYCHAIN_PARTY_ADDRESS> 10000000uward --chain-id <CHAIN_ID> --node <RPC_URL>`

## Fordefi

An active fordefi account is required to bind the keychain.

1. Create a Fordefi [API user](https://docs.fordefi.com/reference/authentication#create-an-api-user-and-token), save
   it's access token. Note: API-User name will be used for the `FORDEFI_API_USER_NAME` environment variable of the
   backend services.
2. Setup [API Signer](https://docs.fordefi.com/reference/set-up-an-api-signer) and
   [activate it](https://docs.fordefi.com/reference/activate-api-signer).
3. [Pair API user with the API Signer](https://docs.fordefi.com/reference/pair-an-api-client-with-the-api-signer). You
   will need to create public/private keys pair for that. From the Fordefi docs:

   > **To create the private key using openSSL:**
   >
   > 1. Open a terminal and issue the following command:
   >    `openssl ecparam -genkey -name prime256v1 -noout -out private.pem`
   > 2. Extract the public key: `openssl ec -in private.pem -pubout`

   > **To upload the API client public key:**
   >
   > 1. Open the API Signer and select Register API user key.
   > 2. Select the API User from the list and press Enter.
   > 3. Paste your public key and press Enter.
   >
   > The public key should be copied without spaces or new lines, as follows:

   > `MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE5oTLGdLQBUHO1QUIGMNASIbsFu3RFKZThEAS2A4f3I9m1PjKszzVQDsBKX5SSm0aXlJQ5gNzYTDZTfBPVPtJfw==`

4. Specify webhook URL in the [Fordefi webhooks settings.](https://docs.fordefi.com/reference/webhooks) Note: if using
   multiple webhooks they will be calling in the order they were creating. To use multiple chains with single Fordefi
   account use `message-handler` and `webhook` with the same `FORDEFI_API_USER_NAME` for single chain.
5. `FORDEFI_CLIENT_PK` is the API user's private key from step 3.
6. `WARDEN_SIGNER_MNEMONIC` is the private key of Keychain party account.
