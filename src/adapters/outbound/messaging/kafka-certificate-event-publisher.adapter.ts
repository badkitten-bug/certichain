import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import {
  CertificateEventPublisher,
  CertificateIssuedEvent,
} from '../../../ports/outbound/certificate-event-publisher.port';

export const KAFKA_CLIENT = 'KAFKA_CLIENT';

/** Topic de Kafka donde se publica el evento `certificate.issued`. */
export const CERTIFICATE_ISSUED_TOPIC =
  process.env.KAFKA_TOPIC ?? 'certificate.issued';

/**
 * Adaptador outbound: publica eventos de certificados en Apache Kafka vía
 * @nestjs/microservices (ClientKafka sobre kafkajs).
 *
 * - El nombre del topic coincide con `event.eventType` ('certificate.issued').
 * - Se usa `certificateId` como key del mensaje para que todos los eventos de
 *   un mismo certificado caigan en la misma partición (orden garantizado).
 */
@Injectable()
export class KafkaCertificateEventPublisherAdapter
  implements CertificateEventPublisher, OnModuleInit, OnModuleDestroy
{
  constructor(@Inject(KAFKA_CLIENT) private readonly client: ClientKafka) {}

  async onModuleInit(): Promise<void> {
    // Conecta el producer al arrancar para no pagar el handshake en la primera emisión.
    await this.client.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }

  publish(event: CertificateIssuedEvent): void {
    // emit() es fire-and-forget: no bloquea el flujo HTTP de emisión.
    this.client
      .emit(CERTIFICATE_ISSUED_TOPIC, {
        key: event.data.certificateId,
        value: event,
        headers: { eventId: event.eventId, eventType: event.eventType },
      })
      .subscribe({
        error: (err: unknown) => {
          console.error(
            `Error publicando evento ${event.eventType} en Kafka:`,
            err,
          );
        },
      });
  }
}
