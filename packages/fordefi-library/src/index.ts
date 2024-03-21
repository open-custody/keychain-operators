import axios from 'axios';

import { IFordefiConfiguration } from './types/configuration';
import { Vault } from './types/vault';
import { CreateVaultParams } from './types/vault.createParams';

export class FordefiSerice {
  configuration: IFordefiConfiguration;

  constructor(configuration: IFordefiConfiguration) {
    this.configuration = configuration;
  }

  async createVault(createVaultParams: CreateVaultParams): Promise<Vault> {
    const url = new URL('vaults', this.configuration.fordefiAPIEndpoint).toString();
    const headers = {
      'Content-type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${this.configuration.accessToken}`,
    };
    const response = await axios.post(url, createVaultParams, { headers });
    return response.data;
  }

  async getVault(id: string): Promise<Vault> {
    const url = new URL(`vaults/${id}`, this.configuration.fordefiAPIEndpoint).toString();
    const headers = {
      Accept: 'application/json',
      Authorization: `Bearer ${this.configuration.accessToken}`,
    };
    const response = await axios.get(url, { headers });
    return response.data;
  }
}
