import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { AppEnv } from '../config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard, OptionalJwtAuthGuard } from './jwt-auth.guard';
import { TokensService } from './tokens.service';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppEnv, true>) => ({
        secret: config.get('jwtSecret', { infer: true }),
        signOptions: { expiresIn: config.get('accessTtlSec', { infer: true }), algorithm: 'HS256' },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokensService, JwtAuthGuard, OptionalJwtAuthGuard],
  exports: [JwtModule, TokensService, JwtAuthGuard],
})
export class AuthModule {}
