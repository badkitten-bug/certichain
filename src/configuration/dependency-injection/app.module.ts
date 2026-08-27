import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule } from '@nestjs/microservices';
import { kafkaOptions } from '../messaging/kafka.config';

// Outbound ports (tokens + interfaces)
import {
  INSTITUTION_REPOSITORY,
  InstitutionRepository,
} from '../../ports/outbound/institution-repository.port';
import {
  CERTIFICATE_REPOSITORY,
  CertificateRepository,
} from '../../ports/outbound/certificate-repository.port';
import { CLOCK, Clock } from '../../ports/outbound/clock.port';
import {
  CERTIFICATE_LEDGER,
  CertificateLedger,
} from '../../ports/outbound/certificate-ledger.port';
import {
  CERTIFICATE_EVENT_PUBLISHER,
  CertificateEventPublisher,
} from '../../ports/outbound/certificate-event-publisher.port';
import { EMAIL_SENDER_PORT } from '../../ports/outbound/email-sender.port';

// Inbound ports (tokens)
import { REGISTER_INSTITUTION_PORT } from '../../ports/inbound/register-institution.port';
import { ISSUE_CERTIFICATE_PORT } from '../../ports/inbound/issue-certificate.port';
import { VERIFY_CERTIFICATE_PORT } from '../../ports/inbound/verify-certificate.port';
import { REVOKE_CERTIFICATE_PORT } from '../../ports/inbound/revoke-certificate.port';
import { VERIFY_CHAIN_PORT } from '../../ports/inbound/verify-chain.port';
import { LIST_HOLDER_CERTIFICATES_PORT } from '../../ports/inbound/list-holder-certificates.port';

// Core: casos de uso
import { RegisterInstitutionUseCase } from '../../core/application/use-cases/register-institution.use-case';
import { IssueCertificateUseCase } from '../../core/application/use-cases/issue-certificate.use-case';
import { VerifyCertificateUseCase } from '../../core/application/use-cases/verify-certificate.use-case';
import { RevokeCertificateUseCase } from '../../core/application/use-cases/revoke-certificate.use-case';
import { VerifyChainUseCase } from '../../core/application/use-cases/verify-chain.use-case';
import { ListHolderCertificatesUseCase } from '../../core/application/use-cases/list-holder-certificates.use-case';

// Adapters outbound: TypeORM/PostgreSQL (activos)
import { typeOrmConfig } from '../database/typeorm.config';
import { InstitutionOrmEntity } from '../../adapters/outbound/persistence/typeorm/entities/institution.orm-entity';
import { CertificateOrmEntity } from '../../adapters/outbound/persistence/typeorm/entities/certificate.orm-entity';
import { BlockOrmEntity } from '../../adapters/outbound/persistence/typeorm/entities/block.orm-entity';
import { TypeOrmInstitutionAdapter } from '../../adapters/outbound/persistence/typeorm/typeorm-institution.adapter';
import { TypeOrmCertificateAdapter } from '../../adapters/outbound/persistence/typeorm/typeorm-certificate.adapter';
import { TypeOrmBlockchainAdapter } from '../../adapters/outbound/blockchain/typeorm/typeorm-blockchain.adapter';
import { SystemClockAdapter } from '../../adapters/outbound/clock/system-clock.adapter';
import {
  KafkaCertificateEventPublisherAdapter,
  KAFKA_CLIENT,
} from '../../adapters/outbound/messaging/kafka-certificate-event-publisher.adapter';
import { NodemailerEmailSenderAdapter } from '../../adapters/outbound/email/nodemailer-email-sender.adapter';

// Adapters inbound: controllers REST, consumidor Kafka y filtro de errores
import { InstitutionsController } from '../../adapters/inbound/rest/institutions.controller';
import { CertificatesController } from '../../adapters/inbound/rest/certificates.controller';
import { BlockchainController } from '../../adapters/inbound/rest/blockchain.controller';
import { CertificateEventsController } from '../../adapters/inbound/messaging/certificate-events.controller';
import { DomainErrorFilter } from '../../adapters/inbound/rest/filters/domain-error.filter';

/**
 * COMPOSITION ROOT — Arquitectura Hexagonal.
 *
 * Adaptadores activos:    TypeORM + PostgreSQL
 * Adaptadores disponibles (compilando, inactivos): Prisma + SQLite
 * Para volver a SQLite: reemplazar TypeOrm* por Sqlite* y TypeOrmModule por PrismaService.
 *
 * Flujo de dependencias:
 *   Adapters inbound (REST) → ports inbound → core (use-cases)
 *   Core (use-cases) → ports outbound → adapters outbound (TypeORM/PostgreSQL, Kafka, SMTP)
 */
@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig),
    TypeOrmModule.forFeature([
      InstitutionOrmEntity,
      CertificateOrmEntity,
      BlockOrmEntity,
    ]),
    ClientsModule.register([{ name: KAFKA_CLIENT, ...kafkaOptions() }]),
  ],
  controllers: [
    InstitutionsController,
    CertificatesController,
    BlockchainController,
    CertificateEventsController,
  ],
  providers: [
    // ── Outbound ports → adaptadores TypeORM/PostgreSQL ─────────────────
    { provide: INSTITUTION_REPOSITORY, useClass: TypeOrmInstitutionAdapter },
    { provide: CERTIFICATE_REPOSITORY, useClass: TypeOrmCertificateAdapter },
    { provide: CERTIFICATE_LEDGER, useClass: TypeOrmBlockchainAdapter },
    { provide: CLOCK, useClass: SystemClockAdapter },

    // ── Outbound ports → mensajería y correo ─────────────────────────────
    {
      provide: CERTIFICATE_EVENT_PUBLISHER,
      useClass: KafkaCertificateEventPublisherAdapter,
    },
    { provide: EMAIL_SENDER_PORT, useClass: NodemailerEmailSenderAdapter },

    // ── Error filter global ──────────────────────────────────────────────
    { provide: APP_FILTER, useClass: DomainErrorFilter },

    // ── Inbound ports → casos de uso (pure classes, sin decoradores) ─────
    {
      provide: REGISTER_INSTITUTION_PORT,
      useFactory: (institutions: InstitutionRepository) =>
        new RegisterInstitutionUseCase(institutions),
      inject: [INSTITUTION_REPOSITORY],
    },
    {
      provide: ISSUE_CERTIFICATE_PORT,
      useFactory: (
        institutions: InstitutionRepository,
        certificates: CertificateRepository,
        ledger: CertificateLedger,
        clock: Clock,
        eventPublisher: CertificateEventPublisher,
      ) =>
        new IssueCertificateUseCase(
          institutions,
          certificates,
          ledger,
          clock,
          eventPublisher,
          process.env.VERIFICATION_BASE_URL ?? 'http://localhost:3000/verify',
        ),
      inject: [
        INSTITUTION_REPOSITORY,
        CERTIFICATE_REPOSITORY,
        CERTIFICATE_LEDGER,
        CLOCK,
        CERTIFICATE_EVENT_PUBLISHER,
      ],
    },
    {
      provide: VERIFY_CERTIFICATE_PORT,
      useFactory: (
        certificates: CertificateRepository,
        institutions: InstitutionRepository,
        ledger: CertificateLedger,
      ) => new VerifyCertificateUseCase(certificates, institutions, ledger),
      inject: [
        CERTIFICATE_REPOSITORY,
        INSTITUTION_REPOSITORY,
        CERTIFICATE_LEDGER,
      ],
    },
    {
      provide: REVOKE_CERTIFICATE_PORT,
      useFactory: (
        certificates: CertificateRepository,
        ledger: CertificateLedger,
        clock: Clock,
      ) => new RevokeCertificateUseCase(certificates, ledger, clock),
      inject: [CERTIFICATE_REPOSITORY, CERTIFICATE_LEDGER, CLOCK],
    },
    {
      provide: VERIFY_CHAIN_PORT,
      useFactory: (ledger: CertificateLedger) => new VerifyChainUseCase(ledger),
      inject: [CERTIFICATE_LEDGER],
    },
    {
      provide: LIST_HOLDER_CERTIFICATES_PORT,
      useFactory: (certificates: CertificateRepository) =>
        new ListHolderCertificatesUseCase(certificates),
      inject: [CERTIFICATE_REPOSITORY],
    },
  ],
})
export class AppModule {}
