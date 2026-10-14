import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthedRequest, AuthUser } from '../common/auth-user';

export function bearerToken(req: AuthedRequest): string | undefined {
  const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
  return scheme === 'Bearer' && token ? token : undefined;
}

/** Requires a valid access token; puts its payload on `req.user`. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const token = bearerToken(req);
    if (!token) throw new UnauthorizedException('Missing access token');
    try {
      req.user = await this.jwt.verifyAsync<AuthUser>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
    return true;
  }
}

/** Like JwtAuthGuard, but lets anonymous requests through (used to upgrade a guest on register). */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const token = bearerToken(req);
    if (token) {
      try {
        req.user = await this.jwt.verifyAsync<AuthUser>(token);
      } catch {
        throw new UnauthorizedException('Invalid or expired access token');
      }
    }
    return true;
  }
}
