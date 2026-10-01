import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { RegisterInstitutionUseCase } from '../../application/use-cases/register-institution.use-case';
import { IssueCertificateUseCase } from '../../application/use-cases/issue-certificate.use-case';
import { RevokeCertificateUseCase } from '../../application/use-cases/revoke-certificate.use-case';

/**
 * Puebla la aplicación con datos de demostración al arrancar, para que
 * la interfaz luzca "ya usada". Es un cliente de la capa de aplicación
 * (usa los casos de uso): no contiene reglas de negocio ni salta capas.
 *
 * No se ejecuta durante las pruebas (NODE_ENV === 'test') para no
 * interferir con las aserciones de los tests e2e.
 */
@Injectable()
export class DemoSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger('DemoSeeder');

  constructor(
    private readonly registerInstitution: RegisterInstitutionUseCase,
    private readonly issueCertificate: IssueCertificateUseCase,
    private readonly revokeCertificate: RevokeCertificateUseCase,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.NODE_ENV === 'test' || process.env.SEED === 'false') {
      return;
    }
    try {
      await this.seed();
    } catch (error) {
      // Un problema al sembrar datos de demo nunca debe impedir el arranque.
      this.logger.warn(
        `No se pudieron cargar los datos de demostración: ${(error as Error).message}`,
      );
    }
  }

  private async seed(): Promise<void> {

    const institutions = [
      { name: 'Universidad Nacional de Ingeniería', country: 'Perú' },
      { name: 'Pontificia Universidad Católica del Perú', country: 'Perú' },
      { name: 'Universidad Nacional Mayor de San Marcos', country: 'Perú' },
      { name: 'Universidad de Lima', country: 'Perú' },
      { name: 'TECSUP', country: 'Perú' },
      { name: 'SENATI', country: 'Perú' },
    ];

    const registered: string[] = [];
    for (const inst of institutions) {
      const out = await this.registerInstitution.execute(inst);
      registered.push(out.id);
    }

    // [índice de institución, nombre, documento, título]
    const certs: [number, string, string, string][] = [
      [0, 'María Fernanda Quispe Rojas', '74125836', 'Ingeniera de Software'],
      [0, 'Carlos Alberto Mendoza Ríos', '70581234', 'Ingeniero Civil'],
      [0, 'Lucía Beatriz Fernández Loayza', '75893012', 'Ingeniera Industrial'],
      [1, 'Diego Alonso Vargas Chávez', '71234567', 'Licenciado en Economía'],
      [1, 'Ana Paula Ramírez Salas', '76540983', 'Licenciada en Derecho'],
      [1, 'José Antonio Castillo Peña', '70012948', 'Ingeniero Informático'],
      [2, 'Valeria Nicole Torres Aguilar', '77820156', 'Médico Cirujano'],
      [2, 'Renato Sebastián Flores Díaz', '72901845', 'Licenciado en Biología'],
      [2, 'Camila Andrea Núñez Vega', '75330267', 'Licenciada en Educación'],
      [3, 'Gabriel Eduardo Ríos Campos', '73458190', 'Administrador de Empresas'],
      [3, 'Fernanda Isabel Guzmán León', '76123409', 'Licenciada en Comunicaciones'],
      [3, 'Sebastián Mateo Paredes Ruiz', '70998321', 'Ingeniero de Sistemas'],
      [4, 'Rodrigo Alonso Cárdenas Silva', '74671203', 'Técnico en Mecatrónica'],
      [4, 'Melissa Alejandra Ortiz Bravo', '77045612', 'Técnica en Diseño Industrial'],
      [4, 'Kevin Joaquín Herrera Muñoz', '72580934', 'Técnico en Redes y Comunicaciones'],
      [5, 'Andrea Milagros Chino Apaza', '75912480', 'Técnica en Electrónica Industrial'],
      [5, 'Bruno Alexander Salazar Ponce', '71703856', 'Técnico en Mecánica Automotriz'],
      [5, 'Daniela Sofía Rojas Ventura', '76284501', 'Técnica en Administración Industrial'],
    ];

    const issued: string[] = [];
    for (const [instIdx, holderName, holderDocument, degreeTitle] of certs) {
      const out = await this.issueCertificate.execute({
        institutionId: registered[instIdx],
        holderName,
        holderDocument,
        degreeTitle,
      });
      issued.push(out.verificationCode);
    }

    // Revocaciones realistas: cada certificado lo revoca SU institución emisora
    // (el segundo índice coincide con el instIdx del certificado en `certs`).
    const revocations: [number, number, string][] = [
      [4, 1, 'Error en el nombre del titular durante la emisión'],
      [7, 2, 'Certificado emitido por duplicado'],
      [13, 4, 'Solicitud de anulación por la institución'],
    ];
    for (const [certIdx, instIdx, reason] of revocations) {
      await this.revokeCertificate.execute({
        verificationCode: issued[certIdx],
        institutionId: registered[instIdx],
        reason,
      });
    }

    this.logger.log(
      `Datos de demostración cargados: ${institutions.length} instituciones, ` +
        `${certs.length} certificados (${revocations.length} revocados).`,
    );
  }
}
