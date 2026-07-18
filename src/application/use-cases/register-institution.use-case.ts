import { randomUUID } from 'node:crypto';
import { Institution } from '../../domain/entities/institution.entity';
import { InstitutionRepository } from '../../domain/repositories/institution.repository';
import {
  InstitutionOutput,
  RegisterInstitutionInput,
} from '../dtos/certichain.dtos';

export class RegisterInstitutionUseCase {
  constructor(private readonly institutions: InstitutionRepository) {}

  async execute(input: RegisterInstitutionInput): Promise<InstitutionOutput> {
    // Las invariantes (nombre, país) las hace cumplir la entidad al construirse.
    const institution = new Institution(randomUUID(), input.name, input.country);
    await this.institutions.save(institution);
    return {
      id: institution.id,
      name: institution.name,
      country: institution.country,
      active: institution.active,
    };
  }
}
