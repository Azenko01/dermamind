import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** What the access token carries. `sub` is the user id — never taken from request params. */
export interface AuthUser {
  sub: string;
  guest: boolean;
  role: 'user' | 'admin';
}

export type AuthedRequest = Request & { user?: AuthUser };

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  const user = ctx.switchToHttp().getRequest<AuthedRequest>().user;
  if (!user) throw new Error('CurrentUser used on a route without JwtAuthGuard');
  return user;
});
