import { randomUUID } from 'node:crypto';
import { Certificate } from '../../domain/entities/certificate.entity';
import { InstitutionNotFoundError } from '../../domain/exceptions/domain.errors';
import { CertificateRepository } from '../../../ports/outbound/certificate-repository.port';
import { InstitutionRepository } from '../../../ports/outbound/institution-repository.port';
import { Clock } from '../../../ports/outbound/clock.port';
import { CertificateLedger } from '../../../ports/outbound/certificate-ledger.port';
import {
  CertificateEventPublisher,
  CertificateIssuedEvent,
} from '../../../ports/outbound/certificate-event-publisher.port';
import {
  IssueCertificateInput,
  IssueCertificateOutput,
  LedgerEvent,
} from '../dto/certichain.dto';

/**
 * CU-02: Emitir certificado.
 * 1. La institución existe y está activa (RN-01).
 * 2. Se construye el certificado y su hash SHA-256 (RN-03).
 * 3. El hash se ancla como bloque de EMISION en la cadena.
 * 4. Se persiste el certificado con su código de verificación único (RF-04).
 * 5. Se publica el evento `certificate.issued` (no bloqueante) para notificar por correo.
 */
export class IssueCertificateUseCase {
  constructor(
    private readonly institutions: InstitutionRepository,
    private readonly certificates: CertificateRepository,
    private readonly ledger: CertificateLedger,
    private readonly clock: Clock,
    private readonly eventPublisher?: CertificateEventPublisher,
    private readonly verificationBaseUrl: string = 'http://localhost:3000/verify',
  ) {}

  async execute(input: IssueCertificateInput): Promise<IssueCertificateOutput> {
    const institution = await this.institutions.findById(input.institutionId);
    if (!institution) {
      throw new InstitutionNotFoundError(input.institutionId);
    }
    institution.ensureCanIssue();

    const certificate = new Certificate(
      randomUUID(),
      institution.id,
      input.holderName,
      input.holderDocument,
      input.degreeTitle,
      this.clock.now(),
    );

    const event: LedgerEvent = {
      type: 'EMISION',
      verificationCode: certificate.verificationCode,
      contentHash: certificate.contentHash,
      institutionId: institution.id,
      at: certificate.issuedAt.toISOString(),
    };
    const block = await this.ledger.append(JSON.stringify(event));

    await this.certificates.save(certificate);

    this.publishIssuedEvent(certificate, institution.id, input.holderEmail);

    return {
      verificationCode: certificate.verificationCode,
      contentHash: certificate.contentHash,
      blockIndex: block.index,
      blockHash: block.hash,
      issuedAt: certificate.issuedAt.toISOString(),
    };
  }

  /** Publica el evento de integración; los fallos no afectan la respuesta HTTP. */
  private publishIssuedEvent(certificate: Certificate, institutionId: string, holderEmail: string): void {
    if (!this.eventPublisher) return;
    try {
      const issuedEvent: CertificateIssuedEvent = {
        eventId: randomUUID(),
        eventType: 'certificate.issued',
        occurredAt: this.clock.now().toISOString(),
        data: {
          certificateId: certificate.verificationCode,
          institutionId,
          holderName: certificate.holderName,
          holderEmail,
          degreeTitle: certificate.degreeTitle,
          verificationCode: certificate.verificationCode,
          verificationUrl: `${this.verificationBaseUrl}/${certificate.verificationCode}`,
          issuedAt: certificate.issuedAt.toISOString(),
        },
      };
      this.eventPublisher.publish(issuedEvent);
    } catch (err) {
      console.error('Error preparando/publicando evento certificate.issued:', err);
    }
  }
}
