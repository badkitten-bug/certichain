import { CertificateStatus } from '../../domain/entities/certificate.entity';
import { CertificateNotFoundError } from '../../domain/errors/domain.errors';
import { CertificateRepository } from '../../domain/repositories/certificate.repository';
import { InstitutionRepository } from '../../domain/repositories/institution.repository';
import { CertificateLedger } from '../ports/certificate-ledger.port';
import {
  LedgerEvent,
  VerifyCertificateOutput,
} from '../dtos/certichain.dtos';

/**
 * CU-03: Verificación pública (RN-07). Un certificado es VALIDO solo si
 * (RN-08): existe, su contenido coincide con el hash anclado, la cadena
 * está íntegra y no fue revocado.
 */
export class VerifyCertificateUseCase {
  constructor(
    private readonly certificates: CertificateRepository,
    private readonly institutions: InstitutionRepository,
    private readonly ledger: CertificateLedger,
  ) {}

  async execute(verificationCode: string): Promise<VerifyCertificateOutput> {
    const certificate =
      await this.certificates.findByVerificationCode(verificationCode);
    if (!certificate) {
      throw new CertificateNotFoundError(verificationCode);
    }

    const chain = await this.ledger.getChain();

    let chainIntact = true;
    for (let i = 1; i < chain.length; i++) {
      if (!chain[i].isValidSuccessorOf(chain[i - 1])) {
        chainIntact = false;
        break;
      }
    }

    const emission = chain
      .slice(1)
      .map((block) => ({ block, event: JSON.parse(block.data) as LedgerEvent }))
      .find(
        (x) =>
          x.event.type === 'EMISION' &&
          x.event.verificationCode === verificationCode,
      );

    const contentMatchesAnchor =
      certificate.isIntact() &&
      emission !== undefined &&
      emission.event.contentHash === certificate.computeHash();

    if (!contentMatchesAnchor || !chainIntact) {
      return { verdict: 'ALTERADO' };
    }

    if (certificate.status === CertificateStatus.REVOCADO) {
      return {
        verdict: 'REVOCADO',
        revokedAt: certificate.revokedAt?.toISOString(),
        reason: certificate.revocationReason,
      };
    }

    const institution = await this.institutions.findById(
      certificate.institutionId,
    );

    return {
      verdict: 'VALIDO',
      certificate: {
        holderName: certificate.holderName,
        degreeTitle: certificate.degreeTitle,
        institution: institution?.name ?? certificate.institutionId,
        issuedAt: certificate.issuedAt.toISOString(),
      },
      proof: {
        blockIndex: emission.block.index,
        blockHash: emission.block.hash,
        chainIntact: true,
      },
    };
  }
}
