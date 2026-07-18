import { Block } from '../../domain/value-objects/block';
import { CertificateLedger } from '../ports/certificate-ledger.port';
import { VerifyChainUseCase } from './verify-chain.use-case';

class FakeLedger implements CertificateLedger {
  constructor(private readonly chain: Block[]) {}
  async append(data: string) {
    const prev = this.chain[this.chain.length - 1];
    const block = new Block(prev.index + 1, 1000 + prev.index, data, prev.hash);
    this.chain.push(block);
    return block;
  }
  async getChain() {
    return [...this.chain];
  }
}

describe('VerifyChainUseCase (CU-05)', () => {
  it('valida una cadena íntegra', async () => {
    const ledger = new FakeLedger([Block.genesis()]);
    await ledger.append('emision-1');
    await ledger.append('revocacion-1');

    const result = await new VerifyChainUseCase(ledger).execute();

    expect(result).toEqual({ valid: true, totalBlocks: 3 });
  });

  it('detecta un bloque manipulado y señala dónde (CP-11)', async () => {
    const ledger = new FakeLedger([Block.genesis()]);
    await ledger.append('emision-1');
    await ledger.append('emision-2');

    const chain = await ledger.getChain();
    // un atacante altera el contenido del bloque 1 ya anclado
    (chain[1] as unknown as { data: string }).data = 'emision-falsificada';

    const result = await new VerifyChainUseCase({
      append: (d) => ledger.append(d),
      getChain: async () => chain,
    }).execute();

    expect(result.valid).toBe(false);
    expect(result.corruptedAtIndex).toBe(1);
  });
});
