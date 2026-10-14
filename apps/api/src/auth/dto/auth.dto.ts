import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const trimLower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @ApiProperty({ example: 'ola@example.com' })
  @Transform(trimLower)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({ example: 'Ola' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayName?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'ola@example.com' })
  @Transform(trimLower)
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  refreshToken!: string;
}

export class PasswordResetDto {
  @ApiProperty({ example: 'ola@example.com' })
  @Transform(trimLower)
  @IsEmail()
  email!: string;
}

export class AppleSignInDto {
  @ApiProperty({ description: 'identityToken from expo-apple-authentication' })
  @IsString()
  @IsNotEmpty()
  identityToken!: string;
}

export class GoogleSignInDto {
  @ApiProperty({ description: 'ID token from Google Sign-In' })
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}

export class AuthUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, nullable: true })
  email!: string | null;

  @ApiProperty()
  isGuest!: boolean;
}

export class AuthTokensDto {
  @ApiProperty({ description: 'JWT, valid 15 minutes' })
  accessToken!: string;

  @ApiProperty({ description: 'Opaque, valid 30 days, single use (rotated on refresh)' })
  refreshToken!: string;

  @ApiProperty({ description: 'Access token lifetime in seconds', example: 900 })
  expiresIn!: number;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}
