import { Client } from '@warden/wardenprotocol-client/dist';
import { promisify } from 'util';

import { IWardenConfiguration } from './types/configuration';
import { INewKeyRequest } from './types/newKeyRequest';

const delay = promisify((ms: number, res: () => void) => setTimeout(res, ms));

export class WardenService {
  configuration: IWardenConfiguration;
  keys: Set<string>;

  constructor(configuration: IWardenConfiguration) {
    this.keys = new Set();
    this.configuration = configuration;
  }

  client() {
    return new Client(this.configuration);
  }

  async *pollNewKeys(): AsyncGenerator<INewKeyRequest> {
    const query = this.client().WardenWarden.query;

    while (this.configuration.pollingIntervalMsec >= 0) {
      for (const key of this.keys) {
        const keyResponse = await query.queryKeyRequestById({ id: key }).catch(console.error);

        if (!keyResponse || !keyResponse.data.key_request) continue;

        if (keyResponse.data.key_request.status !== 'KEY_REQUEST_STATUS_PENDING') this.keys.delete(key);
      }

      const pendingKeys = await query
        .queryKeyRequests({
          keychain_id: '2',
          status: 'KEY_REQUEST_STATUS_PENDING',
          'pagination.count_total': true,
          'pagination.limit': '100',
        })
        .catch(console.error);

      if (!pendingKeys || !pendingKeys.data.key_requests) continue;

      for (let i = 0; i < +pendingKeys.data.pagination.total; i++) {
        const key = pendingKeys.data.key_requests[i];

        if (this.keys.has(key.id)) continue;

        this.keys.add(key.id);

        yield {
          id: key.id,
          keychainId: key.keychain_id,
          spaceId: key.space_id,
          creator: key.creator,
        };
      }

      await delay(this.configuration.pollingIntervalMsec);
    }
  }
}

const service = new WardenService({
  apiURL: 'http://127.0.0.1:1317',
  rpcURL: 'http://127.0.0.1:26657',
  prefix: 'warden',
  pollingIntervalMsec: 5000,
});

(async () => {
  for await (const i of service.pollNewKeys()) console.log(i);
})();
