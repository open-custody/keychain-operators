import { CanActivate, ExecutionContext, Injectable, RawBodyRequest, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

import { FORDEFI_NOTE_REGEX } from '../validation/regex.js';

@Injectable()
export class ApiUserGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const fordefiApiUserName = this.configService.getOrThrow('FORDEFI_API_USER_NAME');

    const request: RawBodyRequest<Request> = context.switchToHttp().getRequest();

    const match = request.body.event.note.match(FORDEFI_NOTE_REGEX);

    if (match === null) {
      throw new UnauthorizedException('Invalid note field');
    }

    const [_a, _b, _c, requestApiUserName] = match;

    return fordefiApiUserName === requestApiUserName;
  }
}
