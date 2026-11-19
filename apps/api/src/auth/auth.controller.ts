import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotImplementedResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';
import { CurrentUser, type AuthUser, type AuthedRequest } from '../common/auth-user';
import { AuthService } from './auth.service';
import {
  AppleSignInDto,
  AuthTokensDto,
  ChangePasswordDto,
  GoogleSignInDto,
  LoginDto,
  PasswordResetDto,
  RefreshDto,
  RegisterDto,
} from './dto/auth.dto';
import { JwtAuthGuard, OptionalJwtAuthGuard } from './jwt-auth.guard';

@ApiTags('auth')
@ApiTooManyRequestsResponse({ description: 'Rate limit per IP' })
@SkipThrottle({ scan: true })
@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('guest')
  @ApiCreatedResponse({ type: AuthTokensDto })
  guest(): Promise<AuthTokensDto> {
    return this.auth.createGuest();
  }

  /** With a guest access token in `Authorization`, the guest account is upgraded in place. */
  @Post('register')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: AuthTokensDto })
  @ApiConflictResponse({ description: 'E-mail taken, or caller already has an account' })
  register(@Body() dto: RegisterDto, @Req() req: AuthedRequest): Promise<AuthTokensDto> {
    return this.auth.register(dto, req.user);
  }

  /** With a guest access token, a guest's quiz moves to an account that has no profile yet. */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: AuthTokensDto })
  @ApiUnauthorizedResponse({ description: 'Wrong e-mail or password' })
  login(@Body() dto: LoginDto, @Req() req: AuthedRequest): Promise<AuthTokensDto> {
    return this.auth.login(dto, req.user);
  }

  /** New tokens come back; every other session of the account is signed out. */
  @Post('password/change')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: AuthTokensDto })
  @ApiUnauthorizedResponse({ description: 'Wrong current password' })
  @ApiForbiddenResponse({ description: 'Guest account — no password' })
  changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AuthTokensDto> {
    return this.auth.changePassword(user, dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthTokensDto })
  @ApiUnauthorizedResponse({ description: 'Unknown, expired or already used refresh token' })
  refresh(@Body() dto: RefreshDto): Promise<AuthTokensDto> {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  logout(@Body() dto: RefreshDto): Promise<void> {
    return this.auth.logout(dto.refreshToken);
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiAcceptedResponse({ description: 'Same answer whether or not the e-mail exists' })
  async passwordReset(@Body() dto: PasswordResetDto): Promise<void> {
    await this.auth.requestPasswordReset(dto.email);
  }

  @Post('apple')
  @ApiNotImplementedResponse({ description: 'Until Apple credentials are configured' })
  apple(@Body() _dto: AppleSignInDto): never {
    return this.auth.signInWithApple();
  }

  @Post('google')
  @ApiNotImplementedResponse({ description: 'Until Google credentials are configured' })
  google(@Body() _dto: GoogleSignInDto): never {
    return this.auth.signInWithGoogle();
  }
}
