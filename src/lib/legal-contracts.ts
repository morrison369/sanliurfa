/**
 * Phase 77: Legal & Contract Management
 * Legal document management, contract creation, template management, document lifecycle
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type ContractType = 'employment' | 'vendor' | 'client' | 'nda' | 'service' | 'lease' | 'partnership' | 'other';
export type ContractStatus = 'draft' | 'active' | 'expired' | 'terminated' | 'archived';
export type DocumentType = 'contract' | 'agreement' | 'license' | 'policy' | 'certification' | 'permit';

export interface Contract {
  id: string;
  name: string;
  type: ContractType;
  parties: string[];
  startDate: number;
  endDate?: number;
  status: ContractStatus;
  value?: number;
  currency?: string;
  createdAt: number;
  createdBy: string;
}

export interface ContractTemplate {
  id: string;
  name: string;
  type: ContractType;
  description: string;
  content: string;
  sections: string[];
  createdAt: number;
}

export interface LegalDocument {
  id: string;
  name: string;
  type: DocumentType;
  contractId?: string;
  content: string;
  version: number;
  status: 'draft' | 'signed' | 'archived';
  signedDate?: number;
  signedBy?: string;
  createdAt: number;
}

export interface ContractParty {
  id: string;
  contractId: string;
  name: string;
  type: 'individual' | 'organization';
  email?: string;
  phone?: string;
  address?: string;
  createdAt: number;
}

function formatCustomizationValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    if (value > 1_000_000_000_000) {
      return new Date(value).toISOString().split('T')[0];
    }
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function renderTemplateContent(content: string, customizations: Record<string, any>): string {
  const derivedValues: Record<string, string> = {
    parties: formatCustomizationValue(customizations.parties),
    partyNames: formatCustomizationValue(customizations.partyNames || customizations.parties),
    contractName: formatCustomizationValue(customizations.name),
    startDate: formatCustomizationValue(customizations.startDate),
    endDate: formatCustomizationValue(customizations.endDate),
    currency: formatCustomizationValue(customizations.currency),
    value: formatCustomizationValue(customizations.value),
    createdBy: formatCustomizationValue(customizations.createdBy)
  };

  const values = { ...derivedValues, ...Object.fromEntries(Object.entries(customizations).map(([key, value]) => [key, formatCustomizationValue(value)])) };

  return Object.entries(values).reduce((result, [key, value]) => {
    const moustachePattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    const bracePattern = new RegExp(`\\{${key}\\}`, 'g');
    return result.replace(moustachePattern, value).replace(bracePattern, value);
  }, content);
}

// ==================== CONTRACT MANAGER ====================

export class ContractManager {
  private contracts = new Map<string, Contract>();
  private contractCount = 0;

  /**
   * Create contract
   */
  createContract(contract: Omit<Contract, 'id' | 'createdAt'>): Contract {
    const id = 'contract-' + Date.now() + '-' + this.contractCount++;

    const newContract: Contract = {
      ...contract,
      id,
      createdAt: Date.now()
    };

    this.contracts.set(id, newContract);
    logger.info('Contract created', { contractId: id, type: contract.type, name: contract.name });

    return newContract;
  }

  /**
   * Get contract
   */
  getContract(contractId: string): Contract | null {
    return this.contracts.get(contractId) || null;
  }

  /**
   * List contracts
   */
  listContracts(type?: ContractType, status?: ContractStatus): Contract[] {
    let contracts = Array.from(this.contracts.values());

    if (type) {
      contracts = contracts.filter(c => c.type === type);
    }

    if (status) {
      contracts = contracts.filter(c => c.status === status);
    }

    return contracts;
  }

  /**
   * Update contract
   */
  updateContract(contractId: string, updates: Partial<Contract>): void {
    const contract = this.contracts.get(contractId);
    if (contract) {
      Object.assign(contract, updates);
      logger.debug('Contract updated', { contractId });
    }
  }

  /**
   * Renew contract
   */
  renewContract(contractId: string, newEndDate: number): void {
    const contract = this.contracts.get(contractId);
    if (contract) {
      contract.endDate = newEndDate;
      contract.status = 'active';
      logger.info('Contract renewed', { contractId, newEndDate });
    }
  }

  /**
   * Terminate contract
   */
  terminateContract(contractId: string, reason: string): void {
    const contract = this.contracts.get(contractId);
    if (contract) {
      contract.status = 'terminated';
      logger.info('Contract terminated', { contractId, reason });
    }
  }

  /**
   * Get expiring contracts
   */
  getExpiringContracts(daysAhead: number): Contract[] {
    const now = Date.now();
    const threshold = now + daysAhead * 86400000;

    return Array.from(this.contracts.values()).filter(
      c => c.endDate && c.endDate <= threshold && c.endDate >= now && c.status === 'active'
    );
  }
}

// ==================== TEMPLATE MANAGER ====================

export class TemplateManager {
  private templates = new Map<string, ContractTemplate>();
  private templateCount = 0;

  /**
   * Create template
   */
  createTemplate(template: Omit<ContractTemplate, 'id' | 'createdAt'>): ContractTemplate {
    const id = 'template-' + Date.now() + '-' + this.templateCount++;

    const newTemplate: ContractTemplate = {
      ...template,
      id,
      createdAt: Date.now()
    };

    this.templates.set(id, newTemplate);
    logger.info('Template created', { templateId: id, name: template.name });

    return newTemplate;
  }

  /**
   * Get template
   */
  getTemplate(templateId: string): ContractTemplate | null {
    return this.templates.get(templateId) || null;
  }

  /**
   * List templates
   */
  listTemplates(type?: ContractType): ContractTemplate[] {
    let templates = Array.from(this.templates.values());

    if (type) {
      templates = templates.filter(t => t.type === type);
    }

    return templates;
  }

  /**
   * Update template
   */
  updateTemplate(templateId: string, updates: Partial<ContractTemplate>): void {
    const template = this.templates.get(templateId);
    if (template) {
      Object.assign(template, updates);
      logger.debug('Template updated', { templateId });
    }
  }

  /**
   * Create contract from template
   */
  createContractFromTemplate(templateId: string, customizations: Record<string, any>): Contract {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const contract = contractManager.createContract({
      name: customizations.name || template.name,
      type: template.type,
      parties: customizations.parties || [],
      startDate: customizations.startDate || Date.now(),
      endDate: customizations.endDate,
      status: customizations.status || 'draft',
      value: customizations.value,
      currency: customizations.currency,
      createdBy: customizations.createdBy || 'system'
    });

    const content = renderTemplateContent(template.content, {
      ...customizations,
      contractId: contract.id,
      templateName: template.name
    });

    documentManager.createDocument({
      name: `${contract.name} Document`,
      type: 'contract',
      contractId: contract.id,
      content,
      version: 1,
      status: 'draft'
    });

    logger.info('Contract created from template', { templateId, contractId: contract.id, type: template.type });

    return contract;
  }
}

// ==================== DOCUMENT MANAGER ====================

export class DocumentManager {
  private documents = new Map<string, LegalDocument>();
  private documentCount = 0;

  /**
   * Create document
   */
  createDocument(doc: Omit<LegalDocument, 'id' | 'createdAt'>): LegalDocument {
    const id = 'doc-' + Date.now() + '-' + this.documentCount++;

    const newDoc: LegalDocument = {
      ...doc,
      id,
      createdAt: Date.now()
    };

    this.documents.set(id, newDoc);
    logger.info('Document created', { documentId: id, type: doc.type, name: doc.name });

    return newDoc;
  }

  /**
   * Get document
   */
  getDocument(documentId: string): LegalDocument | null {
    return this.documents.get(documentId) || null;
  }

  /**
   * List documents
   */
  listDocuments(contractId?: string, type?: DocumentType): LegalDocument[] {
    let documents = Array.from(this.documents.values());

    if (contractId) {
      documents = documents.filter(d => d.contractId === contractId);
    }

    if (type) {
      documents = documents.filter(d => d.type === type);
    }

    return documents;
  }

  /**
   * Update document
   */
  updateDocument(documentId: string, updates: Partial<LegalDocument>): void {
    const document = this.documents.get(documentId);
    if (document) {
      Object.assign(document, updates);
      logger.debug('Document updated', { documentId });
    }
  }

  /**
   * Sign document
   */
  signDocument(documentId: string, signedBy: string): void {
    const document = this.documents.get(documentId);
    if (document) {
      document.status = 'signed';
      document.signedDate = Date.now();
      document.signedBy = signedBy;
      logger.info('Document signed', { documentId, signedBy });
    }
  }

  /**
   * Version document
   */
  versionDocument(documentId: string, newContent: string): LegalDocument {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const newVersion = this.createDocument({
      name: document.name,
      type: document.type,
      contractId: document.contractId,
      content: newContent,
      version: document.version + 1,
      status: 'draft'
    });

    return newVersion;
  }
}

// ==================== PARTY MANAGER ====================

export class PartyManager {
  private parties = new Map<string, ContractParty>();
  private partyCount = 0;

  /**
   * Add party
   */
  addParty(party: Omit<ContractParty, 'id' | 'createdAt'>): ContractParty {
    const id = 'party-' + Date.now() + '-' + this.partyCount++;

    const newParty: ContractParty = {
      ...party,
      id,
      createdAt: Date.now()
    };

    this.parties.set(id, newParty);
    logger.info('Party added', { partyId: id, contractId: party.contractId, name: party.name });

    return newParty;
  }

  /**
   * Get party
   */
  getParty(partyId: string): ContractParty | null {
    return this.parties.get(partyId) || null;
  }

  /**
   * Get contract parties
   */
  getContractParties(contractId: string): ContractParty[] {
    return Array.from(this.parties.values()).filter(p => p.contractId === contractId);
  }

  /**
   * Update party
   */
  updateParty(partyId: string, updates: Partial<ContractParty>): void {
    const party = this.parties.get(partyId);
    if (party) {
      Object.assign(party, updates);
      logger.debug('Party updated', { partyId });
    }
  }

  /**
   * Remove party
   */
  removeParty(partyId: string): void {
    this.parties.delete(partyId);
    logger.info('Party removed', { partyId });
  }
}

// ==================== EXPORTS ====================

export const contractManager = new ContractManager();
export const templateManager = new TemplateManager();
export const documentManager = new DocumentManager();
export const partyManager = new PartyManager();
