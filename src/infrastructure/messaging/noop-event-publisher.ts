import { Injectable, Logger } from '@nestjs/common';
import {
  EventPublisher,
  IntegrationEvent,
} from '../../application/ports/event-publisher.port';

/**
 * Publicador que NO usa broker: solo registra el evento en el log.
 * Se usa en local y CI (donde no hay RabbitMQ), así los casos de uso
 * publican eventos sin depender de infraestructura externa.
 */
@Injectable()
export class NoopEventPublisher implements EventPublisher {
  private readonly logger = new Logger('EventPublisher(noop)');

  async publish(event: IntegrationEvent): Promise<void> {
    this.logger.log(`Evento (sin broker): ${event.type} · ${event.verificationCode}`);
  }
}
