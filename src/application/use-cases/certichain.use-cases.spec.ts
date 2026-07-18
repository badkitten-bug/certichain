import { Certificate } from '../../domain/entities/certificate.entity';
import { Institution } from '../../domain/entities/institution.entity';
import {
  CertificateAlreadyRevokedError,
  CertificateNotFoundError,
  InactiveInstitutionError,
  InstitutionNotFoundError,
  NotIssuingInstitutionError,
} from '../../domain/errors/domain.errors';
import { CertificateRepository } from '../../domain/repositories/certificate.repository';
import { InstitutionRepository } from '../../domain/repositories/institution.repository';
import { Block } from '../../domain/value-objects/block';
import { Clock } from '../ports/clock.port';
import { CertificateLedger } from '../ports/certificate-ledger.port';
import { IssueCertificateUseCase } from './issue-certificate.use-case';
import { RevokeCertificateUseCase } from './revoke-certificate.use-case';
import { VerifyCertificateUseCase } from './verify-certificate.use-case';

// ---- Fakes: implementaciones mínimas de los contratos, solo para probar ----

class FakeInstitutionRepo implements InstitutionRepository {
  private items = new Map<string, Institution>();
  async save(i: Institution) {
    this.items.set(i.id, i);
  }
  async findById(id: string) {
    return this.items.get(id) ?? null;
  }
  async findAll() {
    return [...this.items.values()];
  }
}

class FakeCertificateRepo implements CertificateRepository {
  private items = new Map<string, Certificate>();
  async save(c: Certificate) {
    this.items.set(c.verificationCode, c);
  }
  async findByVerificationCode(code: string) {
    return this.items.get(code) ?? null;
  }
  async findByHolderDocument(document: string) {
    return [...this.items.values()].filter((c) => c.holderDocument === document);
  }
}

class FakeLedger implements CertificateLedger {
  private chain = [Block.genesis()];
  async append(data: string) {
    const prev = this.chain[this.chain.length - 1];
    const block = new Block(prev.index + 1, 1000 + prev.index, data, prev.hash);
    this.chain.push(block);
    return block;
  }
  async getChain() {
    return [...this.chain];
  }
}

const fixedClock = (iso: string): Clock => ({ now: () => new Date(iso) });

// ---------------------------------------------------------------------------

describe('Casos de uso de CertiChain', () => {
  let institutions: FakeInstitutionRepo;
  let certificates: FakeCertificateRepo;
  let ledger: FakeLedger;
  let clock: Clock;

  let issue: IssueCertificateUseCase;
  let verify: VerifyCertificateUseCase;
  let revoke: RevokeCertificateUseCase;

  const uni = new Institution('inst-1', 'Universidad Nacional de Ingeniería', 'Perú');

  const issueInput = {
    institutionId: 'inst-1',
    holderName: 'María Fernanda Quispe',
    holderDocument: '74125836',
    degreeTitle: 'Ingeniera de Software',
  };

  beforeEach(async () => {
    institutions = new FakeInstitutionRepo();
    certificates = new FakeCertificateRepo();
    ledger = new FakeLedger();
    clock = fixedClock('2026-07-17T15:30:00Z');
    await institutions.save(uni);

    issue = new IssueCertificateUseCase(institutions, certificates, ledger, clock);
    verify = new VerifyCertificateUseCase(certificates, institutions, ledger);
    revoke = new RevokeCertificateUseCase(certificates, ledger, clock);
  });

  it('emite un certificado anclándolo como bloque (CP-06)', async () => {
    const result = await issue.execute(issueInput);

    expect(result.verificationCode).toBeDefined();
    expect(result.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.blockIndex).toBe(1);

    const chain = await ledger.getChain();
    expect(chain).toHaveLength(2);
    expect(chain[1].data).toContain(result.contentHash);
  });

  it('rechaza la emisión de una institución inactiva y no toca la cadena (CP-07)', async () => {
    await institutions.save(new Institution('inst-2', 'Instituto Cerrado', 'Perú', false));

    await expect(
      issue.execute({ ...issueInput, institutionId: 'inst-2' }),
    ).rejects.toThrow(InactiveInstitutionError);
    expect(await ledger.getChain()).toHaveLength(1);
  });

  it('rechaza la emisión de una institución inexistente', async () => {
    await expect(
      issue.execute({ ...issueInput, institutionId: 'no-existe' }),
    ).rejects.toThrow(InstitutionNotFoundError);
  });

  it('verifica un certificado vigente como VALIDO con prueba de anclaje (CP-08)', async () => {
    const issued = await issue.execute(issueInput);
    const result = await verify.execute(issued.verificationCode);

    expect(result.verdict).toBe('VALIDO');
    expect(result.certificate?.institution).toBe('Universidad Nacional de Ingeniería');
    expect(result.proof).toEqual({
      blockIndex: 1,
      blockHash: issued.blockHash,
      chainIntact: true,
    });
  });

  it('detecta un certificado ALTERADO tras manipular el contenido persistido (CP-09)', async () => {
    const issued = await issue.execute(issueInput);
    const stored = await certificates.findByVerificationCode(issued.verificationCode);
    // un atacante edita el título en la base de datos, pero el hash anclado no miente
    (stored as unknown as { degreeTitle: string }).degreeTitle = 'Doctora en Medicina';

    const result = await verify.execute(issued.verificationCode);
    expect(result.verdict).toBe('ALTERADO');
  });

  it('verificar un código inexistente lanza CertificateNotFoundError (CP-13)', async () => {
    await expect(verify.execute('no-existe')).rejects.toThrow(CertificateNotFoundError);
  });

  it('revoca un certificado y la verificación pasa a REVOCADO (CP-02/CP-12)', async () => {
    const issued = await issue.execute(issueInput);
    await revoke.execute({
      verificationCode: issued.verificationCode,
      institutionId: 'inst-1',
      reason: 'Error en el nombre del titular',
    });

    const result = await verify.execute(issued.verificationCode);
    expect(result.verdict).toBe('REVOCADO');
    expect(result.reason).toBe('Error en el nombre del titular');

    // RN-06: la revocación agregó un bloque, no borró el de emisión
    expect(await ledger.getChain()).toHaveLength(3);
  });

  it('solo la institución emisora puede revocar (RN-04, CP-10)', async () => {
    const issued = await issue.execute(issueInput);
    await expect(
      revoke.execute({
        verificationCode: issued.verificationCode,
        institutionId: 'otra-institucion',
        reason: 'intento indebido',
      }),
    ).rejects.toThrow(NotIssuingInstitutionError);
  });

  it('no permite revocar dos veces (RN-05, CP-03)', async () => {
    const issued = await issue.execute(issueInput);
    const input = {
      verificationCode: issued.verificationCode,
      institutionId: 'inst-1',
      reason: 'motivo',
    };
    await revoke.execute(input);
    await expect(revoke.execute(input)).rejects.toThrow(CertificateAlreadyRevokedError);
  });
});
