import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AppEnv } from '../config';
import { AppConfigDto } from './app-config.dto';

@ApiTags('app-config')
@Controller('app-config')
export class AppConfigController {
  constructor(private readonly config: ConfigService<AppEnv, true>) {}

  /** Public, no auth: the app calls it on start-up before anything else. */
  @Get()
  @ApiOkResponse({ type: AppConfigDto })
  get(): AppConfigDto {
    return {
      minAppVersion: this.config.get('minAppVersion', { infer: true }),
      latestAppVersion: this.config.get('latestAppVersion', { infer: true }),
      features: { ai: false, scanner: false },
    };
  }
}
