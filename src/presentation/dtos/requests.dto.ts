import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterInstitutionRequest {
  @ApiProperty({ example: 'Universidad Nacional de Ingeniería', description: 'Nombre completo de la institución (mínimo 3 caracteres)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Perú', description: 'País de la institución' })
  @IsString()
  @IsNotEmpty()
  country: string;
}

export class IssueCertificateRequest {
  @ApiProperty({ example: 'uuid-de-la-institucion', description: 'ID de la institución emisora' })
  @IsString()
  @IsNotEmpty()
  institutionId: string;

  @ApiProperty({ example: 'María Fernanda Quispe', description: 'Nombre completo del titular' })
  @IsString()
  @IsNotEmpty()
  holderName: string;

  @ApiProperty({ example: '74125836', description: 'Número de documento del titular' })
  @IsString()
  @IsNotEmpty()
  holderDocument: string;

  @ApiProperty({ example: 'Ingeniera de Software', description: 'Título del grado o certificación' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  degreeTitle: string;
}

export class RevokeCertificateRequest {
  @ApiProperty({ example: 'uuid-de-la-institucion', description: 'ID de la institución que revoca (debe ser la emisora)' })
  @IsString()
  @IsNotEmpty()
  institutionId: string;

  @ApiProperty({ example: 'Error en el nombre del titular', description: 'Motivo de la revocación' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
