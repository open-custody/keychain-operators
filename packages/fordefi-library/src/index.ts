import axios from 'axios';

import { Vault } from './types/vault';
import { CreateVaultParams } from './types/vault.createParams';

export class FordefiClient {
  constructor(
    private fordefiAPIEndpoint: string,
    private accessToken: string,
  ) {}

  async createVault(createVaultParams: CreateVaultParams): Promise<Vault> {
    const url = new URL('vaults', this.fordefiAPIEndpoint).toString();
    const headers = {
      'Content-type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${this.accessToken}`,
    };
    const response = await axios.post(url, createVaultParams, { headers });
    return response.data;
  }
}
