import { CanActivate, ExecutionContext, Injectable, RawBodyRequest, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Request } from 'express';

@Injectable()
export class SignatureGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const fordefiPublicKey = this.configService.getOrThrow('FORDEFI_PUBLIC_KEY').replace(/\\n/g, '\n');

    const request: RawBodyRequest<Request> = context.switchToHttp().getRequest();
    const signature = request.get('X-Signature');

    if (signature === undefined || signature === '') {
      throw new UnauthorizedException('Missing signature');
    }

    const verifier = crypto.createVerify('sha256');
    verifier.update(request.rawBody);
    verifier.end();

    const isValid = verifier.verify(fordefiPublicKey, signature, 'base64');

    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    return true;
  }
}
