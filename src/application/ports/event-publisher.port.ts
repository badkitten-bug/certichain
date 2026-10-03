/**
 * Puerto de publicación de eventos de integración.
 * La capa de aplicación solo conoce este contrato; el transporte real
 * (RabbitMQ hoy; podría ser otro broker mañana) vive en infraestructura.
 * El dominio de certificados no sabe que esto existe.
 */
export type IntegrationEvent =
  | {
      type: 'certificate.issued';
      verificationCode: string;
      institutionId: string;
      contentHash: string;
      at: string;
    }
  | {
      type: 'certificate.revoked';
      verificationCode: string;
      institutionId: string;
      reason: string;
      at: string;
    };

export interface EventPublisher {
  /** Publica un evento. Es "fire-and-forget": no debe romper el caso de uso. */
  publish(event: IntegrationEvent): Promise<void>;
}

export const EVENT_PUBLISHER = Symbol('EventPublisher');
