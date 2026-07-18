import { CertificateLedger } from '../ports/certificate-ledger.port';
import { ChainVerificationOutput } from '../dtos/certichain.dtos';

/**
 * CU-05: Auditoría pública. Recorre la cadena y comprueba que cada
 * bloque esté íntegro y encadene con el anterior (RN-09). Cualquier
 * alteración de una emisión o revocación ya registrada se detecta aquí.
 */
export class VerifyChainUseCase {
  constructor(private readonly ledger: CertificateLedger) {}

  async execute(): Promise<ChainVerificationOutput> {
    const chain = await this.ledger.getChain();

    for (let i = 1; i < chain.length; i++) {
      if (!chain[i].isValidSuccessorOf(chain[i - 1])) {
        return { valid: false, totalBlocks: chain.length, corruptedAtIndex: i };
      }
    }

    return { valid: true, totalBlocks: chain.length };
  }
}
