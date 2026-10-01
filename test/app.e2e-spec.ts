import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';

/**
 * Better Auth es un paquete solo-ESM y Jest corre en CommonJS, así que
 * se mockean sus módulos para estas pruebas. El flujo de certificados y
 * el guard (sesión presente / ausente) se ejercitan igual; la integración
 * real de login social + MFA se verifica manualmente en el navegador.
 */
const mockGetSession = jest.fn();

jest.mock('better-auth/node', () => ({
  toNodeHandler: () => (_req: unknown, res: { status: (c: number) => { end: () => void } }) =>
    res.status(501).end(),
  fromNodeHeaders: () => new Headers(),
}));

jest.mock('./../src/infrastructure/auth/auth', () => ({
  auth: { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } },
}));

/**
 * CP-12: prueba de extremo a extremo del flujo completo a través
 * de la API real, con todas las capas ensambladas:
 * registrar institución -> emitir -> verificar (VALIDO) ->
 * revocar -> verificar (REVOCADO) -> auditar cadena.
 */
describe('Flujo completo de CertiChain (e2e)', () => {
  let app: INestApplication;
  let institutionId: string;
  let verificationCode: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>({
      bodyParser: false,
    });
    configureApp(app as NestExpressApplication);
    await app.init();
  });

  beforeEach(() => {
    // Por defecto hay una sesión válida (usuario logueado); el guard deja pasar.
    mockGetSession.mockResolvedValue({ user: { id: 'u1' }, session: { id: 's1' } });
  });

  afterAll(async () => {
    await app.close();
  });

  it('exige sesión para emitir: sin login responde 401', () => {
    mockGetSession.mockResolvedValueOnce(null); // simula petición sin sesión
    return request(app.getHttpServer())
      .post('/certificates')
      .send({
        institutionId: 'x',
        holderName: 'Sin Sesion',
        holderDocument: '00000000',
        degreeTitle: 'Intento',
      })
      .expect(401);
  });

  it('registra una institución (autenticado)', async () => {
    const res = await request(app.getHttpServer())
      .post('/institutions')
      .send({ name: 'Universidad Nacional de Ingeniería', country: 'Perú' })
      .expect(201);

    institutionId = res.body.id;
    expect(res.body.active).toBe(true);
  });

  it('rechaza una institución con datos inválidos (422)', () => {
    return request(app.getHttpServer())
      .post('/institutions')
      .send({ name: 'UN', country: 'Perú' })
      .expect(422);
  });

  it('POST /certificates con body vacío responde 400 (CP-15 — validación HTTP)', () => {
    return request(app.getHttpServer()).post('/certificates').send({}).expect(400);
  });

  it('emite un certificado anclado en la blockchain', async () => {
    const res = await request(app.getHttpServer())
      .post('/certificates')
      .send({
        institutionId,
        holderName: 'María Fernanda Quispe',
        holderDocument: '74125836',
        degreeTitle: 'Ingeniera de Software',
      })
      .expect(201);

    verificationCode = res.body.verificationCode;
    expect(res.body.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(res.body.blockIndex).toBe(1);
  });

  it('cualquiera verifica el certificado: VALIDO con prueba de anclaje', async () => {
    const res = await request(app.getHttpServer())
      .get(`/certificates/${verificationCode}/verify`)
      .expect(200);

    expect(res.body.verdict).toBe('VALIDO');
    expect(res.body.certificate.institution).toBe('Universidad Nacional de Ingeniería');
    expect(res.body.proof.chainIntact).toBe(true);
  });

  it('verificar un código inexistente responde 404 (CP-13)', () => {
    return request(app.getHttpServer())
      .get('/certificates/no-existe/verify')
      .expect(404);
  });

  it('otra institución no puede revocar (403)', () => {
    return request(app.getHttpServer())
      .post(`/certificates/${verificationCode}/revoke`)
      .send({ institutionId: 'otra-institucion', reason: 'intento indebido' })
      .expect(403);
  });

  it('la institución emisora revoca el certificado', async () => {
    const res = await request(app.getHttpServer())
      .post(`/certificates/${verificationCode}/revoke`)
      .send({ institutionId, reason: 'Error en el nombre del titular' })
      .expect(201);

    expect(res.body.status).toBe('REVOCADO');
    expect(res.body.blockIndex).toBe(2);
  });

  it('revocar dos veces responde 409 (RN-05)', () => {
    return request(app.getHttpServer())
      .post(`/certificates/${verificationCode}/revoke`)
      .send({ institutionId, reason: 'de nuevo' })
      .expect(409);
  });

  it('la verificación ahora responde REVOCADO', async () => {
    const res = await request(app.getHttpServer())
      .get(`/certificates/${verificationCode}/verify`)
      .expect(200);

    expect(res.body.verdict).toBe('REVOCADO');
    expect(res.body.reason).toBe('Error en el nombre del titular');
  });

  it('el titular lista sus certificados', async () => {
    const res = await request(app.getHttpServer())
      .get('/holders/74125836/certificates')
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe('REVOCADO');
  });

  it('la cadena queda íntegra y auditable: génesis + emisión + revocación', async () => {
    const res = await request(app.getHttpServer())
      .get('/blockchain/verify')
      .expect(200);

    expect(res.body).toEqual({ valid: true, totalBlocks: 3 });
  });

  it('la cadena pública no expone más datos personales que los del certificado (CP-14)', async () => {
    const res = await request(app.getHttpServer()).get('/blockchain').expect(200);

    const raw = JSON.stringify(res.body);
    // el bloque ancla hash y código, nunca nombre ni documento del titular (RN-10)
    expect(raw).not.toContain('María Fernanda Quispe');
    expect(raw).not.toContain('74125836');
  });
});
