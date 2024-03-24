import { User } from '../user';

export interface VaultRef {
  id: string;
  name: string;
  address?: string;
  state: string;
  end_user?: User;
}
