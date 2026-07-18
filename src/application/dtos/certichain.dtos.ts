export interface RegisterInstitutionInput {
  name: string;
  country: string;
}

export interface InstitutionOutput {
  id: string;
  name: string;
  country: string;
  active: boolean;
}

export interface IssueCertificateInput {
  institutionId: string;
  holderName: string;
  holderDocument: string;
  degreeTitle: string;
}

export interface IssueCertificateOutput {
  verificationCode: string;
  contentHash: string;
  blockIndex: number;
  blockHash: string;
  issuedAt: string;
}

export type Verdict = 'VALIDO' | 'REVOCADO' | 'ALTERADO';

export interface VerifyCertificateOutput {
  verdict: Verdict;
  certificate?: {
    holderName: string;
    degreeTitle: string;
    institution: string;
    issuedAt: string;
  };
  proof?: { blockIndex: number; blockHash: string; chainIntact: boolean };
  revokedAt?: string;
  reason?: string;
}

export interface RevokeCertificateInput {
  verificationCode: string;
  institutionId: string;
  reason: string;
}

export interface RevokeCertificateOutput {
  verificationCode: string;
  status: string;
  revokedAt: string;
  blockIndex: number;
}

export interface ChainVerificationOutput {
  valid: boolean;
  totalBlocks: number;
  corruptedAtIndex?: number;
}

export interface HolderCertificateOutput {
  verificationCode: string;
  degreeTitle: string;
  institutionId: string;
  issuedAt: string;
  status: string;
}

/** Payloads que viajan dentro de los bloques de la cadena. */
export interface LedgerEvent {
  type: 'EMISION' | 'REVOCACION';
  verificationCode: string;
  contentHash?: string;
  institutionId?: string;
  reason?: string;
  at: string;
}
