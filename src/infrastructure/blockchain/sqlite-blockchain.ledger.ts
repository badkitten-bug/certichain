import { Injectable } from '@nestjs/common';
import { Block } from '../../domain/value-objects/block';
import { CertificateLedger } from '../../application/ports/certificate-ledger.port';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Implementación SQLite del puerto CertificateLedger.
 * La cadena sobrevive al reinicio del servidor.
 * El bloque génesis se crea de forma lazy la primera vez que se accede.
 */
@Injectable()
export class SqliteBlockchainLedger implements CertificateLedger {
  constructor(private readonly prisma: PrismaService) {}

  async append(data: string): Promise<Block> {
    await this.ensureGenesis();

    const lastRow = await this.prisma.block.findFirst({
      orderBy: { index: 'desc' },
    });
    // ensureGenesis garantiza que siempre hay al menos el génesis
    const previous = new Block(
      lastRow!.index,
      lastRow!.timestamp,
      lastRow!.data,
      lastRow!.previousHash,
    );

    const block = new Block(previous.index + 1, Date.now(), data, previous.hash);

    await this.prisma.block.create({
      data: {
        index: block.index,
        timestamp: block.timestamp,
        data: block.data,
        previousHash: block.previousHash,
        hash: block.hash,
      },
    });

    return block;
  }

  async getChain(): Promise<Block[]> {
    await this.ensureGenesis();

    const rows = await this.prisma.block.findMany({ orderBy: { index: 'asc' } });
    return rows.map(
      (row) => new Block(row.index, row.timestamp, row.data, row.previousHash),
    );
  }

  /** Inserta el bloque génesis si la tabla está vacía. */
  private async ensureGenesis(): Promise<void> {
    const count = await this.prisma.block.count();
    if (count === 0) {
      const genesis = Block.genesis();
      await this.prisma.block.create({
        data: {
          index: genesis.index,
          timestamp: genesis.timestamp,
          data: genesis.data,
          previousHash: genesis.previousHash,
          hash: genesis.hash,
        },
      });
    }
  }
}
