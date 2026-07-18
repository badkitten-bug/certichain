import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

// Domain: contratos (tokens)
import { INSTITUTION_REPOSITORY, InstitutionRepository } from './domain/repositories/institution.repository';
import { CERTIFICATE_REPOSITORY, CertificateRepository } from './domain/repositories/certificate.repository';

// Application: casos de uso y puertos
import { CLOCK, Clock } from './application/ports/clock.port';
import { CERTIFICATE_LEDGER, CertificateLedger } from './application/ports/certificate-ledger.port';
import { RegisterInstitutionUseCase } from './application/use-cases/register-institution.use-case';
import { IssueCertificateUseCase } from './application/use-cases/issue-certificate.use-case';
import { VerifyCertificateUseCase } from './application/use-cases/verify-certificate.use-case';
import { RevokeCertificateUseCase } from './application/use-cases/revoke-certificate.use-case';
import { VerifyChainUseCase } from './application/use-cases/verify-chain.use-case';
import { ListHolderCertificatesUseCase } from './application/use-cases/list-holder-certificates.use-case';

// Infrastructure: implementaciones concretas
import { PrismaService } from './infrastructure/prisma/prisma.service';
import { SqliteBlockchainLedger } from './infrastructure/blockchain/sqlite-blockchain.ledger';
import { SqliteInstitutionRepository } from './infrastructure/persistence/sqlite-institution.repository';
import { SqliteCertificateRepository } from './infrastructure/persistence/sqlite-certificate.repository';
import { SystemClock } from './infrastructure/system-clock';

// Presentation: controladores y filtros
import { InstitutionsController } from './presentation/controllers/institutions.controller';
import { CertificatesController } from './presentation/controllers/certificates.controller';
import { BlockchainController } from './presentation/controllers/blockchain.controller';
import { DomainErrorFilter } from './presentation/filters/domain-error.filter';

/**
 * COMPOSITION ROOT.
 * Aquí (y solo aquí) se decide qué implementación satisface cada
 * contrato. Para migrar a PostgreSQL o a una blockchain real basta
 * con cambiar los `useClass` de este archivo.
 */
@Module({
  controllers: [InstitutionsController, CertificatesController, BlockchainController],
  providers: [
    // infraestructura transversal
    PrismaService,

    // contratos -> implementaciones SQLite
    { provide: INSTITUTION_REPOSITORY, useClass: SqliteInstitutionRepository },
    { provide: CERTIFICATE_REPOSITORY, useClass: SqliteCertificateRepository },
    { provide: CERTIFICATE_LEDGER, useClass: SqliteBlockchainLedger },
    { provide: CLOCK, useClass: SystemClock },
    { provide: APP_FILTER, useClass: DomainErrorFilter },

    // casos de uso: clases puras, se construyen inyectando los contratos
    {
      provide: RegisterInstitutionUseCase,
      useFactory: (institutions: InstitutionRepository) =>
        new RegisterInstitutionUseCase(institutions),
      inject: [INSTITUTION_REPOSITORY],
    },
    {
      provide: IssueCertificateUseCase,
      useFactory: (
        institutions: InstitutionRepository,
        certificates: CertificateRepository,
        ledger: CertificateLedger,
        clock: Clock,
      ) => new IssueCertificateUseCase(institutions, certificates, ledger, clock),
      inject: [INSTITUTION_REPOSITORY, CERTIFICATE_REPOSITORY, CERTIFICATE_LEDGER, CLOCK],
    },
    {
      provide: VerifyCertificateUseCase,
      useFactory: (
        certificates: CertificateRepository,
        institutions: InstitutionRepository,
        ledger: CertificateLedger,
      ) => new VerifyCertificateUseCase(certificates, institutions, ledger),
      inject: [CERTIFICATE_REPOSITORY, INSTITUTION_REPOSITORY, CERTIFICATE_LEDGER],
    },
    {
      provide: RevokeCertificateUseCase,
      useFactory: (
        certificates: CertificateRepository,
        ledger: CertificateLedger,
        clock: Clock,
      ) => new RevokeCertificateUseCase(certificates, ledger, clock),
      inject: [CERTIFICATE_REPOSITORY, CERTIFICATE_LEDGER, CLOCK],
    },
    {
      provide: VerifyChainUseCase,
      useFactory: (ledger: CertificateLedger) => new VerifyChainUseCase(ledger),
      inject: [CERTIFICATE_LEDGER],
    },
    {
      provide: ListHolderCertificatesUseCase,
      useFactory: (certificates: CertificateRepository) =>
        new ListHolderCertificatesUseCase(certificates),
      inject: [CERTIFICATE_REPOSITORY],
    },
  ],
})
export class AppModule {}
