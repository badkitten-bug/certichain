import { Block } from '../../domain/value-objects/block';

/**
 * Puerto hacia el "libro mayor": la blockchain donde se anclan
 * las emisiones y revocaciones. La capa de aplicación solo conoce
 * este contrato; la implementación (cadena simulada hoy, una
 * testnet real mañana) vive en infraestructura.
 */
export interface CertificateLedger {
  /** Ancla un dato como nuevo bloque y devuelve el bloque creado. */
  append(data: string): Promise<Block>;
  /** Devuelve la cadena completa, empezando por el bloque génesis. */
  getChain(): Promise<Block[]>;
}

export const CERTIFICATE_LEDGER = Symbol('CertificateLedger');
