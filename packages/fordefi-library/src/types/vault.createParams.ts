import { BitcoinChain } from './vault.bitcoinChain';
import { KeyType } from './vault.keyType';
import { VaultType } from './vault.type';

export interface CreateVaultParams {
  /** The name of the vault. */
  name: string;
  /** The keyset id of the vault. This field is required for end-user vault creation, otherwise, it's optional. If not provided, the organization's default keyset will be used. */
  keyset_id?: string;
  /** The group to add this vault to. If not provided, the vault will be created in the Default vault group. */
  vault_group_id?: string;
  type: VaultType;
  /** Used only if type = utxo */
  chain?: BitcoinChain;
  key_type: KeyType;
}
