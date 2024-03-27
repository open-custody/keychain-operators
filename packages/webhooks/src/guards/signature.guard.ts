import { CanActivate, ExecutionContext, Injectable, RawBodyRequest, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { Request } from 'express';

const FORDEFI_PUBLIC_KEY = `
-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEQJ0NeDYQqqeCvgDofFsgtgaxk+dx
ybi63YGJwHz8Ebx7YQrmwNWnW3bG65E8wGHqZECjuaK2GKHbZx1EV2ws9A==
-----END PUBLIC KEY-----
`;

@Injectable()
export class SignatureGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request: RawBodyRequest<Request> = context.switchToHttp().getRequest();
    const signature = request.get('X-Signature');

    if (signature === undefined || signature === '') {
      throw new UnauthorizedException('Missing signature');
    }

    const verifier = crypto.createVerify('sha256');
    verifier.update(request.rawBody);
    verifier.end();

    const isValid = verifier.verify(FORDEFI_PUBLIC_KEY, signature, 'base64');

    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    return true;
  }
}
