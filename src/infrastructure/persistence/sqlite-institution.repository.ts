import { Injectable } from '@nestjs/common';
import { Institution } from '../../domain/entities/institution.entity';
import { InstitutionRepository } from '../../domain/repositories/institution.repository';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Implementación SQLite del contrato InstitutionRepository.
 * El mapeo entidad ↔ fila ocurre aquí; el dominio no sabe nada de Prisma.
 */
@Injectable()
export class SqliteInstitutionRepository implements InstitutionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(institution: Institution): Promise<void> {
    await this.prisma.institution.upsert({
      where: { id: institution.id },
      update: {
        name: institution.name,
        country: institution.country,
        active: institution.active,
      },
      create: {
        id: institution.id,
        name: institution.name,
        country: institution.country,
        active: institution.active,
      },
    });
  }

  async findById(id: string): Promise<Institution | null> {
    const row = await this.prisma.institution.findUnique({ where: { id } });
    if (!row) return null;
    return new Institution(row.id, row.name, row.country, row.active);
  }

  async findAll(): Promise<Institution[]> {
    const rows = await this.prisma.institution.findMany();
    return rows.map((row) => new Institution(row.id, row.name, row.country, row.active));
  }
}
