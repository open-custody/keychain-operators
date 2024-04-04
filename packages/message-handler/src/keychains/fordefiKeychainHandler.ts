import { FordefiService } from '@warden/fordefi-library';
import { Vault } from '@warden/fordefi-library/dist/types/vault/vault';
import {
  INewKeyRequestMessage,
  INewSignatureRequestMessage,
  ISignatureStatusMessage,
} from '@warden/message-broker-library';
import { uuid } from '@warden/utils';

import { ISignatureResult, SignatureResultStatus } from '../types/signResult';
import { IKeychainHandler } from './keychainHandler';

export class FordefiKeychainHandler implements IKeychainHandler {
  constructor(
    private fordefi: FordefiService,
    private uuidV5Namespace: string,
  ) {}

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

  async sign(data: INewSignatureRequestMessage): Promise<ISignatureResult> {
    const name = `cr_${data.creator}-kcid-${data.keychainId}`;
    const key = `cr_${data.creator}-srq-${data.requestId}-sd-${data.signingData}`;
    const idempotenceId = uuid(key, this.uuidV5Namespace);

    const publicKey = Buffer.from(data.publicKey, "base64");
    let vault: Vault;

    for (let i = 1; !vault; i++) {
      const page = await this.fordefi.getVaults(name, i, 100);
      vault = page.vaults.find((x) => x.public_key.equals(publicKey));

      if (page.vaults.length === 0) break;
    }

    if (!vault)
      return {
        status: SignatureResultStatus.Failed,
        reason: 'Vault was not found',
      };

    const result = await this.fordefi.createBlackBoxSignatureRequest(
      {
        note: `cr_${data.creator}-srq-${data.requestId}`,
        signer_type: 'api_signer',
        type: 'black_box_signature',
        vault_id: vault.id,
        details: {
          format: 'hash_binary',
          hash_binary: data.signingData,
        },
      },
      idempotenceId,
    );

    let status: SignatureResultStatus;

    switch (result.state) {
      case 'error_signing':
      case 'aborted':
        status = SignatureResultStatus.Failed;
        break;
      case 'completed':
        status = SignatureResultStatus.Success;
        break;
      default:
        status = SignatureResultStatus.Pending;
        break;
    }

    const signature =
      status === SignatureResultStatus.Success ? Buffer.from(result.signatures[0].data, 'base64') : null;

    const reason = status === SignatureResultStatus.Failed ? result.state : null;

    return {
      signature: signature,
      status: status,
      reason: reason,
    };
  }

  async getSignature(data: ISignatureStatusMessage): Promise<Buffer> {
    const blackBoxSignature = await this.fordefi.getBlackBoxSignatureResult(data.keyProviderRequestId);
    return Buffer.from(blackBoxSignature.signatures[0].data, 'base64');
  }
}
