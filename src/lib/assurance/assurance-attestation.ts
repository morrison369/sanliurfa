/**
 * Phase 177: Assurance Attestation
 */

import { logger } from '../logger';

export interface Attestation {
  attestationId: string;
  controlId: string;
  attestorId: string;
  period: string;
  status: 'draft' | 'submitted' | 'signed' | 'rejected';
  createdAt: number;
  updatedAt: number;
}

class AttestationManager {
  private attestations = new Map<string, Attestation>();
  private counter = 0;

  create(controlId: string, attestorId: string, period: string): Attestation {
    const now = Date.now();
    const att: Attestation = {
      attestationId: `att-${Date.now()}-${++this.counter}`,
      controlId,
      attestorId,
      period,
      status: 'draft',
      createdAt: now,
      updatedAt: now
    };
    this.attestations.set(att.attestationId, att);
    return att;
  }

  transition(attestationId: string, status: Attestation['status']): Attestation | undefined {
    const current = this.attestations.get(attestationId);
    if (!current) return undefined;
    const next = { ...current, status, updatedAt: Date.now() };
    this.attestations.set(attestationId, next);
    return next;
  }
}

class AttestationEvidenceBinder {
  private links = new Map<string, string[]>();

  bind(attestationId: string, evidenceId: string): string[] {
    const arr = this.links.get(attestationId) || [];
    arr.push(evidenceId);
    this.links.set(attestationId, arr);
    return arr;
  }

  list(attestationId: string): string[] {
    return this.links.get(attestationId) || [];
  }
}

class AttestationSignatureService {
  sign(attestation: Attestation, signerId: string): { signed: boolean; signatureRef: string; signerId: string } {
    const signatureRef = `sig-${attestation.attestationId}-${signerId}`;
    logger.debug('Attestation signed', { attestationId: attestation.attestationId, signerId });
    return { signed: true, signatureRef, signerId };
  }
}

class AttestationReportBuilder {
  build(attestations: Attestation[]): { total: number; signed: number; rejectionRate: number } {
    const total = attestations.length;
    const signed = attestations.filter(a => a.status === 'signed').length;
    const rejected = attestations.filter(a => a.status === 'rejected').length;
    return {
      total,
      signed,
      rejectionRate: total === 0 ? 0 : Math.round((rejected / total) * 1000) / 10
    };
  }
}

export const attestationManager = new AttestationManager();
export const attestationEvidenceBinder = new AttestationEvidenceBinder();
export const attestationSignatureService = new AttestationSignatureService();
export const attestationReportBuilder = new AttestationReportBuilder();

export {
  AttestationManager,
  AttestationEvidenceBinder,
  AttestationSignatureService,
  AttestationReportBuilder
};


