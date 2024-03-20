import { MissingWalletError } from '@warden/wardenprotocol-client/dist';

export function bolerplate(): string {
  console.log(MissingWalletError.message);

  return 'hello!';
}
bolerplate();
