import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import type { AppEnv } from '../config';
import type { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthTokensDto } from './dto/auth.dto';

interface TokenSubject {
  id: string;
  email: string | null;
  isGuest: boolean;
  role: 'user' | 'admin';
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/**
 * Access tokens are short-lived JWTs. Refresh tokens are random strings; only their SHA-256 hash is
 * stored. Each refresh token works once: using it revokes it and issues a new pair (rotation).
 * Presenting an already used token means it leaked, so every session of that user is revoked.
 */
@Injectable()
export class TokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  async issue(user: TokenSubject): Promise<AuthTokensDto> {
    const payload: AuthUser = { sub: user.id, guest: user.isGuest, role: user.role };
    const accessToken = await this.jwt.signAsync(payload);
    const refreshToken = randomBytes(48).toString('base64url');
    const days = this.config.get('refreshTtlDays', { infer: true });
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      },
    });
    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.get('accessTtlSec', { infer: true }),
      user: { id: user.id, email: user.email, isGuest: user.isGuest },
    };
  }

  async rotate(refreshToken: string): Promise<AuthTokensDto> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      include: { user: true },
    });
    if (!stored) throw new UnauthorizedException('Invalid refresh token');

    // Atomic claim: only one request can revoke a given token.
    const claimed = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (claimed.count === 0) {
      await this.revokeAll(stored.userId);
      throw new UnauthorizedException('Refresh token reuse detected — signed out everywhere');
    }
    if (stored.expiresAt < new Date()) throw new UnauthorizedException('Refresh token expired');

    return this.issue(stored.user);
  }

  async revoke(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
