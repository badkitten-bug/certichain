export interface CertificateIssuedEventData {
  certificateId: string;
  institutionId: string;
  holderName: string;
  holderEmail: string;
  degreeTitle: string;
  verificationCode: string;
  verificationUrl: string;
  issuedAt: string;
}

/** Evento de dominio publicado tras la emisión exitosa de un certificado. */
export interface CertificateIssuedEvent {
  eventId: string;
  eventType: 'certificate.issued';
  occurredAt: string;
  data: CertificateIssuedEventData;
}

/** Puerto outbound: publica eventos de emisión de certificados (p. ej. hacia Kafka). */
export interface CertificateEventPublisher {
  publish(event: CertificateIssuedEvent): void;
}

export const CERTIFICATE_EVENT_PUBLISHER = Symbol('CertificateEventPublisher');
