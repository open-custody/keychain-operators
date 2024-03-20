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
    const query = this.client().WardenWardenV1Beta2.query;

    while (this.configuration.pollingIntervalMsec >= 0) {
      await delay(this.configuration.pollingIntervalMsec);

      for (const key of this.keys) {
        const keyResponse = await query.queryKeyRequestById({ id: key }).catch(console.error);

        if (!keyResponse || !keyResponse.data.key_request) continue;

        if (keyResponse.data.key_request.status !== 'KEY_REQUEST_STATUS_PENDING') this.keys.delete(key);
      }

      const pendingKeys = await query
        .queryKeyRequests({
          keychain_id: this.configuration.keychainId,
          status: 'KEY_REQUEST_STATUS_PENDING',
          'pagination.limit': '100',
        })
        .catch(console.error);

      if (!pendingKeys || !pendingKeys.data.key_requests) continue;

      for (let i = 0; i < +pendingKeys.data.key_requests.length; i++) {
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
    }
  }
}
