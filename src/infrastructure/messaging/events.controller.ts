import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import type { IntegrationEvent } from '../../application/ports/event-publisher.port';

/**
 * Consumidor de eventos (corre como servicio/worker separado).
 * Reacciona a los eventos publicados en RabbitMQ: aquí simplemente
 * los registra (en un sistema real enviaría correos, notificaría a
 * terceros, alimentaría una vista de auditoría, etc.).
 */
@Controller()
export class EventsController {
  private readonly logger = new Logger('EventsConsumer');

  @EventPattern('certificate.issued')
  onIssued(@Payload() event: IntegrationEvent, @Ctx() context: RmqContext): void {
    this.logger.log(
      `📜 Certificado EMITIDO: ${event.verificationCode} (institución ${event.institutionId})`,
    );
    this.ack(context);
  }

  @EventPattern('certificate.revoked')
  onRevoked(@Payload() event: IntegrationEvent, @Ctx() context: RmqContext): void {
    const reason = event.type === 'certificate.revoked' ? event.reason : '';
    this.logger.log(
      `🚫 Certificado REVOCADO: ${event.verificationCode} — motivo: ${reason}`,
    );
    this.ack(context);
  }

  /** Confirma el mensaje para que RabbitMQ lo retire de la cola. */
  private ack(context: RmqContext): void {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    channel.ack(message);
  }
}
