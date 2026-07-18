import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { VerifyChainUseCase } from '../../application/use-cases/verify-chain.use-case';
import { CERTIFICATE_LEDGER } from '../../application/ports/certificate-ledger.port';
import type { CertificateLedger } from '../../application/ports/certificate-ledger.port';

@ApiTags('Blockchain')
@Controller('blockchain')
export class BlockchainController {
  constructor(
    private readonly verifyChain: VerifyChainUseCase,
    @Inject(CERTIFICATE_LEDGER) private readonly ledger: CertificateLedger,
  ) {}

  /** Transparencia: cualquiera puede inspeccionar la cadena (RF-08). */
  @Get()
  @ApiOperation({ summary: 'Obtener todos los bloques de la cadena' })
  @ApiResponse({ status: 200, description: 'Lista de bloques de la blockchain (sin datos personales del titular)' })
  chain() {
    return this.ledger.getChain();
  }

  /** Auditoría pública de integridad (RF-07). */
  @Get('verify')
  @ApiOperation({ summary: 'Verificar la integridad de toda la blockchain' })
  @ApiResponse({ status: 200, description: 'Resultado de la auditoría: { valid: boolean, totalBlocks: number }' })
  @ApiResponse({ status: 500, description: 'La cadena está corrompida' })
  verify() {
    return this.verifyChain.execute();
  }
}
