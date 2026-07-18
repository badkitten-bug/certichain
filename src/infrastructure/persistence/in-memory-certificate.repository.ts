import { Injectable } from '@nestjs/common';
import { Certificate } from '../../domain/entities/certificate.entity';
import { CertificateRepository } from '../../domain/repositories/certificate.repository';

@Injectable()
export class InMemoryCertificateRepository implements CertificateRepository {
  private readonly certificates = new Map<string, Certificate>();

  async save(certificate: Certificate): Promise<void> {
    this.certificates.set(certificate.verificationCode, certificate);
  }

  async findByVerificationCode(code: string): Promise<Certificate | null> {
    return this.certificates.get(code) ?? null;
  }

  async findByHolderDocument(document: string): Promise<Certificate[]> {
    return [...this.certificates.values()].filter(
      (c) => c.holderDocument === document,
    );
  }
}
