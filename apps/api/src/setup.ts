import { INestApplication, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/** Shared by main.ts and the e2e tests so both see the same routes. */
export function setupApp(app: INestApplication): void {
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableShutdownHooks();

  const doc = new DocumentBuilder()
    .setTitle('DermaMind API')
    .setDescription('REST API for the DermaMind mobile app')
    .setVersion('1')
    .build();
  SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, doc));
}
