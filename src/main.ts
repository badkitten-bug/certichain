import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  // bodyParser: false → el parser se monta dentro de configureApp DESPUÉS de
  // Better Auth, cuyo handler necesita el cuerpo de la petición sin procesar.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  // Better Auth (/api/auth/*) + body parser + validación global.
  configureApp(app);

  // Frontend estático de demostración (public/index.html) servido en la raíz.
  app.useStaticAssets(join(process.cwd(), 'public'));

  // Swagger en /docs (antes estaba en /api, que ahora ocupa Better Auth).
  const swaggerConfig = new DocumentBuilder()
    .setTitle('CertiChain API')
    .setDescription(
      'Sistema de emisión y verificación de certificados académicos anclados en blockchain',
    )
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🎓 API de CertiChain escuchando en http://localhost:${port}`);
  console.log(`📄 Swagger UI disponible en http://localhost:${port}/docs`);
  console.log(`🔐 Better Auth montado en http://localhost:${port}/api/auth`);
}
void bootstrap();
