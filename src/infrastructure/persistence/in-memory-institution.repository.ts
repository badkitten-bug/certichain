import { Injectable } from '@nestjs/common';
import { Institution } from '../../domain/entities/institution.entity';
import { InstitutionRepository } from '../../domain/repositories/institution.repository';

/**
 * Implementación en memoria del contrato definido por el dominio.
 * Cambiarla por SQLite/PostgreSQL solo requiere otra clase que
 * implemente InstitutionRepository: nada más del sistema cambia.
 */
@Injectable()
export class InMemoryInstitutionRepository implements InstitutionRepository {
  private readonly institutions = new Map<string, Institution>();

  async save(institution: Institution): Promise<void> {
    this.institutions.set(institution.id, institution);
  }

  async findById(id: string): Promise<Institution | null> {
    return this.institutions.get(id) ?? null;
  }

  async findAll(): Promise<Institution[]> {
    return [...this.institutions.values()];
  }
}
