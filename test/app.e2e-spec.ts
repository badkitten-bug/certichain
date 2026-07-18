import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

/**
 * CP-12: prueba de extremo a extremo del flujo completo a través
 * de la API real, con todas las capas ensambladas:
 * registrar institución -> emitir -> verificar (VALIDO) ->
 * revocar -> verificar (REVOCADO) -> auditar cadena.
 */
describe('Flujo completo de CertiChain (e2e)', () => {
  let app: INestApplication<App>;
  let institutionId: string;
  let verificationCode: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registra una institución', async () => {
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
    return request(app.getHttpServer())
      .post('/certificates')
      .send({})
      .expect(400);
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
