import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfigModule } from './app-config/app-config.module';
import { loadEnv } from './config';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [() => loadEnv()] }),
    PrismaModule,
    HealthModule,
    AppConfigModule,
  ],
})
export class AppModule {}
