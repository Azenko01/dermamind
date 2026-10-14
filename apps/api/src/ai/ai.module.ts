import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CatalogModule } from '../catalog/catalog.module';
import type { AppEnv } from '../config';
import { ScoringModule } from '../scoring/scoring.module';
import { AI_TRANSPORT, createAiTransport } from './ai-transport';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [CatalogModule, ScoringModule],
  controllers: [AiController],
  providers: [
    AiService,
    {
      provide: AI_TRANSPORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppEnv, true>) =>
        createAiTransport({
          anthropicApiKey: config.get('anthropicApiKey', { infer: true }),
          aiTimeoutMs: config.get('aiTimeoutMs', { infer: true }),
        }),
    },
  ],
  exports: [AiService],
})
export class AiModule {}
