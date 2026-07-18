import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Wrapper NestJS sobre PrismaClient.
 * Gestiona el ciclo de vida de la conexión y, en entorno de test,
 * limpia todas las tablas antes de cada suite para garantizar
 * aislamiento sin modificar ningún fichero de test.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
    if (process.env.NODE_ENV === 'test') {
      // Jest establece NODE_ENV='test' automáticamente.
      // Limpiar en orden FK-safe: blocks → certificates → institutions
      await this.block.deleteMany();
      await this.certificate.deleteMany();
      await this.institution.deleteMany();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
