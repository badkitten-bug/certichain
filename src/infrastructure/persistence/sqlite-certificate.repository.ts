import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  Certificate,
  CertificateStatus,
} from '../../domain/entities/certificate.entity';
import { CertificateRepository } from '../../domain/repositories/certificate.repository';
import { PrismaService } from '../prisma/prisma.service';

type CertificateRow = Prisma.CertificateGetPayload<Record<string, never>>;

/**
 * Implementación SQLite del contrato CertificateRepository.
 * Persiste estado REVOCADO, revokedAt y revocationReason.
 * El mapeo fila → entidad reconstruye el objeto de dominio llamando
 * a `revoke()` si el certificado fue revocado, sin tocar el dominio.
 */
@Injectable()
export class SqliteCertificateRepository implements CertificateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(certificate: Certificate): Promise<void> {
    await this.prisma.certificate.upsert({
      where: { verificationCode: certificate.verificationCode },
      update: {
        status: certificate.status,
        revokedAt: certificate.revokedAt ?? null,
        revocationReason: certificate.revocationReason ?? null,
      },
      create: {
        verificationCode: certificate.verificationCode,
        institutionId: certificate.institutionId,
        holderName: certificate.holderName,
        holderDocument: certificate.holderDocument,
        degreeTitle: certificate.degreeTitle,
        issuedAt: certificate.issuedAt,
        status: certificate.status,
        revokedAt: certificate.revokedAt ?? null,
        revocationReason: certificate.revocationReason ?? null,
      },
    });
  }

  async findByVerificationCode(code: string): Promise<Certificate | null> {
    const row = await this.prisma.certificate.findUnique({
      where: { verificationCode: code },
    });
    if (!row) return null;
    return this.rowToEntity(row);
  }

  async findByHolderDocument(document: string): Promise<Certificate[]> {
    const rows = await this.prisma.certificate.findMany({
      where: { holderDocument: document },
    });
    return rows.map((row) => this.rowToEntity(row));
  }

  /**
   * Reconstruye la entidad de dominio a partir de la fila de BD.
   * Para certificados revocados, se llama a `revoke()` (método del dominio)
   * sobre una instancia recién creada (que empieza en VIGENTE).
   */
  private rowToEntity(row: CertificateRow): Certificate {
    const cert = new Certificate(
      row.verificationCode,
      row.institutionId,
      row.holderName,
      row.holderDocument,
      row.degreeTitle,
      row.issuedAt,
    );
    if (
      row.status === CertificateStatus.REVOCADO &&
      row.revokedAt !== null &&
      row.revocationReason !== null
    ) {
      cert.revoke(row.revocationReason, row.revokedAt);
    }
    return cert;
  }
}
