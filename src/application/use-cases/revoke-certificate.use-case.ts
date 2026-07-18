import {
  CertificateNotFoundError,
  NotIssuingInstitutionError,
} from '../../domain/errors/domain.errors';
import { CertificateRepository } from '../../domain/repositories/certificate.repository';
import { Clock } from '../ports/clock.port';
import { CertificateLedger } from '../ports/certificate-ledger.port';
import {
  LedgerEvent,
  RevokeCertificateInput,
  RevokeCertificateOutput,
} from '../dtos/certichain.dtos';

/**
 * CU-04: Revocar certificado.
 * RN-04: solo la institución emisora puede revocar.
 * RN-06: la revocación no borra nada, ancla un nuevo bloque REVOCACION.
 */
export class RevokeCertificateUseCase {
  constructor(
    private readonly certificates: CertificateRepository,
    private readonly ledger: CertificateLedger,
    private readonly clock: Clock,
  ) {}

  async execute(input: RevokeCertificateInput): Promise<RevokeCertificateOutput> {
    const certificate = await this.certificates.findByVerificationCode(
      input.verificationCode,
    );
    if (!certificate) {
      throw new CertificateNotFoundError(input.verificationCode);
    }
    if (certificate.institutionId !== input.institutionId) {
      throw new NotIssuingInstitutionError(input.verificationCode);
    }

    const now = this.clock.now();
    certificate.revoke(input.reason, now); // lanza si ya estaba revocado (RN-05)

    const event: LedgerEvent = {
      type: 'REVOCACION',
      verificationCode: certificate.verificationCode,
      institutionId: input.institutionId,
      reason: input.reason,
      at: now.toISOString(),
    };
    const block = await this.ledger.append(JSON.stringify(event));

    await this.certificates.save(certificate);

    return {
      verificationCode: certificate.verificationCode,
      status: certificate.status,
      revokedAt: now.toISOString(),
      blockIndex: block.index,
    };
  }
}
