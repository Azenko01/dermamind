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
import { ProductImagesModule } from './product-images/product-images.module';
import { RoutinesModule } from './routines/routines.module';
import { ShelvesModule } from './shelves/shelves.module';
import { SubmissionsModule } from './submissions/submissions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [() => loadEnv()] }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      // 'default' guards /auth, /analyze, submissions; 'scan' guards only the barcode lookup, which
      // may call Open Beauty Facts. Each route skips the throttler that isn't meant for it.
      useFactory: (config: ConfigService<AppEnv, true>) => [
        { name: 'default', ttl: 60_000, limit: config.get('authRateLimit', { infer: true }) },
        { name: 'scan', ttl: 60_000, limit: config.get('scanRateLimit', { infer: true }) },
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
    ProductImagesModule,
  ],
})
export class AppModule {}
