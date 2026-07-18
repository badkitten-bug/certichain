import { Injectable } from '@nestjs/common';
import { Block } from '../../domain/value-objects/block';
import { CertificateLedger } from '../../application/ports/certificate-ledger.port';

/**
 * Blockchain simulada: una lista de bloques donde cada uno guarda
 * el hash del anterior. Implementa el puerto CertificateLedger, así
 * que podría reemplazarse por un adaptador a Ethereum/Polygon testnet
 * sin tocar dominio ni casos de uso.
 */
@Injectable()
export class InMemoryBlockchainLedger implements CertificateLedger {
  private readonly chain: Block[] = [Block.genesis()];

  async append(data: string): Promise<Block> {
    const previous = this.chain[this.chain.length - 1];
    const block = new Block(previous.index + 1, Date.now(), data, previous.hash);
    this.chain.push(block);
    return block;
  }

  async getChain(): Promise<Block[]> {
    return [...this.chain];
  }
}
