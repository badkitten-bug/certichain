import { RmqOptions, Transport } from '@nestjs/microservices';

/**
 * Configuración compartida del transporte RabbitMQ (productor y consumidor
 * usan la misma cola). La URL llega por entorno; si no está definida,
 * el sistema cae al publicador "noop" (ver composition root).
 */
export const EVENTS_QUEUE = 'certichain_events';

export function rabbitMqOptions(url: string): RmqOptions {
  return {
    transport: Transport.RMQ,
    options: {
      urls: [url],
      queue: EVENTS_QUEUE,
      queueOptions: { durable: true },
    },
  };
}
