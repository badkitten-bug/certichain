import { Controller, Inject } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  KafkaContext,
  Payload,
} from '@nestjs/microservices';
import { EMAIL_SENDER_PORT } from '../../../ports/outbound/email-sender.port';
import type { EmailSenderPort } from '../../../ports/outbound/email-sender.port';
import type { CertificateIssuedEvent } from '../../../ports/outbound/certificate-event-publisher.port';
import { CERTIFICATE_ISSUED_TOPIC } from '../../outbound/messaging/kafka-certificate-event-publisher.adapter';

/** Adaptador inbound: consumidor Kafka del topic `certificate.issued`. */
@Controller()
export class CertificateEventsController {
  constructor(
    @Inject(EMAIL_SENDER_PORT) private readonly emailSender: EmailSenderPort,
  ) {}

  @EventPattern(CERTIFICATE_ISSUED_TOPIC)
  async handleCertificateIssued(
    @Payload() event: CertificateIssuedEvent,
    @Ctx() context: KafkaContext,
  ): Promise<void> {
    console.log(
      `📥 Evento ${event.eventType} recibido (eventId=${event.eventId}, ` +
        `topic=${context.getTopic()}, partition=${context.getPartition()})`,
    );

    await this.emailSender.sendCertificateEmail({
      to: event.data.holderEmail,
      holderName: event.data.holderName,
      degreeTitle: event.data.degreeTitle,
      verificationUrl: event.data.verificationUrl,
    });
  }
}
