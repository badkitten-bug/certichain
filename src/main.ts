import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { AppModule } from './app.module';
import { auth } from './infrastructure/auth/auth';

async function bootstrap() {
  // bodyParser: false → montamos el parser nosotros DESPUÉS de Better Auth,
  // porque su handler necesita el cuerpo de la petición sin procesar.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  // 1) Better Auth maneja todo /api/auth/* (login social, sesión, MFA).
  //    Debe ir ANTES del body parser y de Swagger. Usamos la instancia
  //    Express interna porque `.all()` no está en el tipo de Nest.
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.all('/api/auth/*splat', toNodeHandler(auth));

  // 2) Body parser para el resto de la API (certificados, instituciones...).
  app.use(json());
  app.use(urlencoded({ extended: true }));

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

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
