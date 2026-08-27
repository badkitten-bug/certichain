import { KafkaOptions, Transport } from '@nestjs/microservices';

/** Brokers de Kafka (lista separada por comas). */
export const kafkaBrokers = (): string[] =>
  (process.env.KAFKA_BROKERS ?? 'localhost:9092')
    .split(',')
    .map((b) => b.trim());

/**
 * Configuración compartida del transporte Kafka.
 * - `client.clientId`: identifica esta aplicación ante el broker.
 * - `consumer.groupId`: todas las instancias con el mismo groupId se reparten
 *   las particiones del topic (escalado horizontal del consumidor de correos).
 */
export const kafkaOptions = (): KafkaOptions => ({
  transport: Transport.KAFKA,
  options: {
    client: {
      clientId: process.env.KAFKA_CLIENT_ID ?? 'certichain-api',
      brokers: kafkaBrokers(),
      retry: { initialRetryTime: 300, retries: 8 },
    },
    consumer: {
      groupId: process.env.KAFKA_GROUP_ID ?? 'certichain-email-consumer',
      allowAutoTopicCreation: true,
    },
    producer: {
      allowAutoTopicCreation: true,
    },
  },
});
