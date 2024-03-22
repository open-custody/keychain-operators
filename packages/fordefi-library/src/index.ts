import axios from 'axios';
import * as crypto from 'crypto';

import { CreateBlackBoxSignatureRequestParams } from './types/blackbox-signature/blackBox.createSignatureParams';
import { BlackBoxSignature } from './types/blackbox-signature/blackBox.signature';
import { IFordefiConfiguration } from './types/vault/configuration';
import { Vault } from './types/vault/vault';
import { CreateVaultParams } from './types/vault/vault.createParams';

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

  async createBlackBoxSignatureRequest(createParams: CreateBlackBoxSignatureRequestParams): Promise<BlackBoxSignature> {
    const url = new URL('transactions', this.configuration.fordefiAPIEndpoint);

    const path = url.pathname;
    const timestamp = new Date().getTime();
    const requestBody = JSON.stringify(createParams);
    const payload = `${path}|${timestamp}|${requestBody}`;

    const privateKey = crypto.createPrivateKey(this.configuration.apiClientPrivateKey);
    const sign = crypto.createSign('SHA256').update(payload, 'utf8').end();
    const signature = sign.sign(privateKey, 'base64');

    const headers = {
      'Content-type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${this.configuration.accessToken}`,
      'x-signature': signature,
      'x-timestamp': timestamp,
      'x-idempotence-id': createParams.idempontenceId,
    };

    const response = await axios.post(url.toString(), createParams, { headers });
    return response.data;
  }

  async getBlackBoxSignatureResult(id: string): Promise<BlackBoxSignature> {
    const url = new URL(`transactions/${id}`, this.configuration.fordefiAPIEndpoint).toString();
    const headers = {
      Accept: 'application/json',
      Authorization: `Bearer ${this.configuration.accessToken}`,
    };
    const response = await axios.get(url, { headers });
    return response.data;
  }
}
