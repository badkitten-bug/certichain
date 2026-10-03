import { Logger } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory } from '@nestjs/microservices';
import {
  EventPublisher,
  IntegrationEvent,
} from '../../application/ports/event-publisher.port';
import { rabbitMqOptions } from './rabbitmq.config';

/**
 * Publicador real: envía los eventos a RabbitMQ.
 * Es "fire-and-forget": si el broker falla, se registra el error pero
 * NUNCA se rompe el caso de uso que lo invocó.
 */
export class RabbitMqEventPublisher implements EventPublisher {
  private readonly logger = new Logger('EventPublisher(rabbitmq)');
  private readonly client: ClientProxy;

  constructor(url: string) {
    this.client = ClientProxyFactory.create(rabbitMqOptions(url));
  }

  async publish(event: IntegrationEvent): Promise<void> {
    try {
      // emit() publica el evento (patrón = event.type) en la cola.
      this.client.emit(event.type, event);
    } catch (error) {
      this.logger.error(
        `No se pudo publicar ${event.type}: ${(error as Error).message}`,
      );
    }
  }
}
