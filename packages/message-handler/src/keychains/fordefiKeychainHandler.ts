import { FordefiService } from '@warden/fordefi-library';
import { INewKeyRequestMessage } from '@warden/message-broker-library';

import { IKeychainHandler } from './keychainHandler';

export class FordefiKeychainHandler implements IKeychainHandler {
  constructor(private fordefi: FordefiService) {}

  async createKey(data: INewKeyRequestMessage): Promise<Buffer> {
    const name = `cr_${data.creator}-kcid-${data.keychainId}-krq-${data.requestId}`;

    const vault =
      (await this.fordefi.getVault(name)) ??
      (await this.fordefi.createVault({
        key_type: 'ecdsa_secp256k1',
        type: 'black_box',
        name: name,
      }));

    return vault.public_key;
  }
}
