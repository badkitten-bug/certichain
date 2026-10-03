import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { ConsumerModule } from './consumer-module';
import { rabbitMqOptions } from './infrastructure/messaging/rabbitmq.config';

/**
 * Entrypoint del worker consumidor de eventos (servicio separado).
 * Se ejecuta con: node dist/consumer.js
 * Requiere RABBITMQ_URL (en docker-compose/Dokploy).
 */
async function bootstrap() {
  const url = process.env.RABBITMQ_URL;
  if (!url) {
    Logger.error('Falta RABBITMQ_URL; el consumidor no puede arrancar.', 'Consumer');
    process.exit(1);
  }

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    ConsumerModule,
    rabbitMqOptions(url),
  );
  await app.listen();
  Logger.log(`🐇 Consumidor de eventos escuchando la cola de RabbitMQ`, 'Consumer');
}
void bootstrap();
