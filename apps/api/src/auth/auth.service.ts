import {
  ConflictException,
  Injectable,
  Logger,
  NotImplementedException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import type { AuthUser } from '../common/auth-user';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthTokensDto, LoginDto, RegisterDto } from './dto/auth.dto';
import { TokensService } from './tokens.service';

/** System shelves every account gets (PLAN.md 3.6). */
const SYSTEM_SHELVES = [{ kind: 'own' }, { kind: 'like' }, { kind: 'avoid' }] as const;

/** Used when the e-mail is unknown, so a failed login takes as long as a wrong password. */
const DUMMY_HASH = argon2.hash('dermamind-timing-equaliser');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
  ) {}

  /** Anonymous account for people who don't want to sign up yet; can be upgraded later. */
  async createGuest(): Promise<AuthTokensDto> {
    const user = await this.prisma.user.create({
      data: {
        isGuest: true,
        profile: { create: { shelves: { create: [...SYSTEM_SHELVES] } } },
      },
    });
    return this.tokens.issue(user);
  }

  /**
   * E-mail sign-up. If the caller is a guest (valid guest access token), that same account is
   * upgraded, so the quiz answers and shelves stay.
   */
  async register(dto: RegisterDto, caller?: AuthUser): Promise<AuthTokensDto> {
    if (caller && !caller.guest) throw new ConflictException('Already signed in with an account');
    const passwordHash = await argon2.hash(dto.password);
    const displayName = dto.displayName?.trim() || undefined;

    try {
      const guest = caller
        ? await this.prisma.user.findFirst({ where: { id: caller.sub, isGuest: true } })
        : null;
      const user = guest
        ? await this.prisma.user.update({
            where: { id: guest.id },
            data: {
              email: dto.email,
              passwordHash,
              isGuest: false,
              profile: displayName ? { update: { displayName } } : undefined,
            },
          })
        : await this.prisma.user.create({
            data: {
              email: dto.email,
              passwordHash,
              profile: { create: { displayName, shelves: { create: [...SYSTEM_SHELVES] } } },
            },
          });
      if (guest) await this.tokens.revokeAll(guest.id); // old guest refresh tokens die with the upgrade
      return this.tokens.issue(user);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('E-mail already registered');
      }
      throw err;
    }
  }

  async login(dto: LoginDto): Promise<AuthTokensDto> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const ok = await argon2.verify(user?.passwordHash ?? (await DUMMY_HASH), dto.password);
    if (!user?.passwordHash || !ok) throw new UnauthorizedException('Wrong e-mail or password');
    return this.tokens.issue(user);
  }

  refresh(refreshToken: string): Promise<AuthTokensDto> {
    return this.tokens.rotate(refreshToken);
  }

  logout(refreshToken: string): Promise<void> {
    return this.tokens.revoke(refreshToken);
  }

  /** Stub: always answers the same, so it doesn't reveal which e-mails exist. */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    // TODO(Sprint 6): create a one-time reset token and send it by e-mail (provider not chosen yet).
    if (user)
      this.logger.log(`Password reset requested for user ${user.id} (e-mail not sent: stub)`);
  }

  signInWithApple(): never {
    // TODO: verify identityToken against Apple JWKS (aud = bundle ID com.dermamind.app),
    // then find-or-create by apple_sub. Needs the Apple Developer account — ask Oleksandr first.
    throw new NotImplementedException('Sign in with Apple is not configured yet');
  }

  signInWithGoogle(): never {
    // TODO: verify idToken against Google JWKS (aud = our OAuth client IDs),
    // then find-or-create by google_sub. Needs Google Cloud OAuth clients — ask Oleksandr first.
    throw new NotImplementedException('Sign in with Google is not configured yet');
  }
}
