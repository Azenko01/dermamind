import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import helmet from 'helmet';

export function buildOpenApi(app: INestApplication): OpenAPIObject {
  const doc = new DocumentBuilder()
    .setTitle('DermaMind API')
    .setDescription('REST API for the DermaMind mobile app')
    .setVersion('1')
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, doc);
}

/** Shared by main.ts, the OpenAPI export and the e2e tests so all of them see the same app. */
export function setupApp(app: INestApplication): void {
  app.use(helmet());
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableShutdownHooks();
  SwaggerModule.setup('docs', app, () => buildOpenApi(app));
}
