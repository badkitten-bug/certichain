import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { MicroserviceOptions } from '@nestjs/microservices';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Carga .env antes de resolver AppModule: TypeOrmModule.forRoot lee
 * process.env al importarse, así que el import de AppModule debe ser
 * dinámico y posterior a esta carga (Node 22+, sin dotenv).
 */
if (!process.env.DATABASE_URL_PG) {
  const envPath = resolve(process.cwd(), '.env');
  if (existsSync(envPath)) {
    (
      process as NodeJS.Process & { loadEnvFile?: (path: string) => void }
    ).loadEnvFile?.(envPath);
  }
}

async function bootstrap() {
  const { AppModule } =
    await import('./configuration/dependency-injection/app.module.js');
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // Consumidor Kafka (topic certificate.issued) en el mismo proceso de NestJS.
  const { kafkaOptions } =
    await import('./configuration/messaging/kafka.config.js');
  app.connectMicroservice<MicroserviceOptions>(kafkaOptions());
  await app.startAllMicroservices();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('CertiChain API')
    .setDescription(
      'Sistema de emisión y verificación de certificados académicos anclados en blockchain',
    )
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🎓 API de CertiChain escuchando en http://localhost:${port}`);
  console.log(`📄 Swagger UI disponible en http://localhost:${port}/api`);
  console.log(
    `📨 Consumidor Kafka escuchando el topic "${process.env.KAFKA_TOPIC ?? 'certificate.issued'}" ` +
      `(brokers: ${process.env.KAFKA_BROKERS ?? 'localhost:9092'})`,
  );
}
void bootstrap();
