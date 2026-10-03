import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './infrastructure/auth/auth';

/**
 * Configuración compartida entre el arranque real (main.ts) y las pruebas e2e,
 * para que el entorno de test se comporte igual que producción en lo esencial.
 *
 * El orden importa: el handler de Better Auth (/api/auth/*) debe ir ANTES del
 * body parser, porque necesita el cuerpo de la petición sin procesar.
 */
export function configureApp(app: NestExpressApplication): void {
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.all('/api/auth/*splat', toNodeHandler(auth));

  app.use(json());
  app.use(urlencoded({ extended: true }));

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
}
