import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AiModule } from './ai/ai.module';
import { AnalyzeModule } from './analyze/analyze.module';
import { AppConfigModule } from './app-config/app-config.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { loadEnv, type AppEnv } from './config';
import { HealthModule } from './health/health.module';
import { IngredientsModule } from './ingredients/ingredients.module';
import { MeModule } from './me/me.module';
import { PrismaModule } from './prisma/prisma.module';
import { RoutinesModule } from './routines/routines.module';
import { ShelvesModule } from './shelves/shelves.module';
import { SubmissionsModule } from './submissions/submissions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [() => loadEnv()] }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppEnv, true>) => [
        { ttl: 60_000, limit: config.get('authRateLimit', { infer: true }) },
      ],
    }),
    PrismaModule,
    HealthModule,
    AppConfigModule,
    AuthModule,
    MeModule,
    CatalogModule,
    IngredientsModule,
    AiModule,
    AnalyzeModule,
    SubmissionsModule,
    ShelvesModule,
    RoutinesModule,
  ],
})
export class AppModule {}
