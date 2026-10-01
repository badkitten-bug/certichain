import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RegisterInstitutionUseCase } from '../../application/use-cases/register-institution.use-case';
import { INSTITUTION_REPOSITORY } from '../../domain/repositories/institution.repository';
import type { InstitutionRepository } from '../../domain/repositories/institution.repository';
import { RegisterInstitutionRequest } from '../dtos/requests.dto';
import { AuthGuard } from '../guards/auth.guard';

/**
 * Capa más externa: solo traduce HTTP <-> casos de uso.
 * No contiene ni una sola regla de negocio.
 */
@ApiTags('Instituciones')
@Controller('institutions')
export class InstitutionsController {
  constructor(
    private readonly registerInstitution: RegisterInstitutionUseCase,
    @Inject(INSTITUTION_REPOSITORY)
    private readonly institutions: InstitutionRepository,
  ) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Registrar una nueva institución emisora (requiere sesión)' })
  @ApiResponse({ status: 201, description: 'Institución registrada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos (campos requeridos faltantes)' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 422, description: 'Nombre demasiado corto (mínimo 3 caracteres, RN-02)' })
  register(@Body() body: RegisterInstitutionRequest) {
    return this.registerInstitution.execute(body);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las instituciones registradas' })
  @ApiResponse({ status: 200, description: 'Lista de instituciones' })
  list() {
    return this.institutions.findAll();
  }
}
