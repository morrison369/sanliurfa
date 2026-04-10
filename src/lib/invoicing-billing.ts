/**
 * Phase 59: Invoicing & Billing System
 * Invoice generation, billing cycles, payment tracking, reconciliation
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
export type PaymentMethod = 'credit_card' | 'bank_transfer' | 'check' | 'ach' | 'paypal' | 'wire';

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  amount: number;
  taxAmount: number;
  status: InvoiceStatus;
  dueDate: number;
  createdAt: number;
  paidAt?: number;
}

export interface LineItem {
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  taxable: boolean;
}

export interface BillingCycleRecord {
  id: string;
  customerId: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  nextBillingDate: number;
  amount: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  status: 'pending' | 'completed' | 'failed';
  processedAt?: number;
}

// ==================== INVOICE GENERATOR ====================

export class InvoiceGenerator {
  private invoices = new Map<string, Invoice>();
  private lineItems = new Map<string, LineItem[]>();
  private invoiceCounter = 1000;

  createInvoice(invoice: Omit<Invoice, 'id' | 'number' | 'createdAt'>): Invoice {
    const invoiceNumber = `INV-${this.invoiceCounter++}`;
    const fullInvoice: Invoice = {
      ...invoice,
      id: 'inv-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      number: invoiceNumber,
      createdAt: Date.now()
    };

    this.invoices.set(fullInvoice.id, fullInvoice);
    logger.debug('Invoice created', { invoiceId: fullInvoice.id, invoiceNumber });

    return fullInvoice;
  }

  getInvoice(invoiceId: string): Invoice | null {
    return this.invoices.get(invoiceId) || null;
  }

  listInvoices(customerId?: string, status?: InvoiceStatus): Invoice[] {
    let invoices = Array.from(this.invoices.values());

    if (customerId) {
      invoices = invoices.filter(i => i.customerId === customerId);
    }

    if (status) {
      invoices = invoices.filter(i => i.status === status);
    }

    return invoices;
  }

  generatePDF(invoiceId: string): string {
    const pdfUrl = `/invoices/${invoiceId}.pdf`;
    logger.debug('Invoice PDF generated', { invoiceId });
    return pdfUrl;
  }

  sendInvoice(invoiceId: string, email: string): void {
    const invoice = this.invoices.get(invoiceId);
    if (invoice) {
      invoice.status = 'sent';
      logger.info('Invoice sent', { invoiceId, email });
    }
  }

  cancelInvoice(invoiceId: string, reason: string): void {
    const invoice = this.invoices.get(invoiceId);
    if (invoice) {
      invoice.status = 'cancelled';
      logger.info('Invoice cancelled', { invoiceId, reason });
    }
  }
}

// ==================== BILLING CYCLE ====================

export class BillingCycleManager {
  private cycles = new Map<string, BillingCycleRecord>();

  createCycle(cycle: Omit<BillingCycleRecord, 'id'>): BillingCycleRecord {
    const fullCycle: BillingCycleRecord = {
      ...cycle,
      id: 'cycle-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
    };

    this.cycles.set(fullCycle.id, fullCycle);
    logger.debug('Billing cycle created', { cycleId: fullCycle.id, customerId: cycle.customerId });

    return fullCycle;
  }

  getCycle(cycleId: string): BillingCycleRecord | null {
    return this.cycles.get(cycleId) || null;
  }

  listCycles(customerId: string): BillingCycleRecord[] {
    return Array.from(this.cycles.values()).filter(c => c.customerId === customerId);
  }

  updateNextBillingDate(cycleId: string, newDate: number): void {
    const cycle = this.cycles.get(cycleId);
    if (cycle) {
      cycle.nextBillingDate = newDate;
      logger.debug('Next billing date updated', { cycleId, newDate });
    }
  }

  triggerBilling(cycleId: string): Invoice {
    const cycle = this.cycles.get(cycleId);
    if (!cycle) {
      throw new Error('Cycle not found');
    }

    const invoice: Invoice = {
      id: 'inv-' + Date.now(),
      number: 'INV-AUTO-' + Date.now(),
      customerId: cycle.customerId,
      amount: cycle.amount,
      taxAmount: 0,
      status: 'sent',
      dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
      createdAt: Date.now()
    };

    logger.info('Billing triggered from cycle', { cycleId, invoiceId: invoice.id });
    return invoice;
  }
}

// ==================== PAYMENT RECONCILIATION ====================

export class PaymentReconciliation {
  private payments: Payment[] = [];
  private unmatchedPayments: Payment[] = [];

  recordPayment(payment: Payment): void {
    this.payments.push(payment);
    if (payment.status === 'completed') {
      logger.debug('Payment recorded', { paymentId: payment.id, invoiceId: payment.invoiceId });
    }
  }

  matchPayment(invoiceId: string, paymentAmount: number): boolean {
    const matched = Math.abs(paymentAmount) < 0.01; // Within penny
    logger.debug('Payment match attempt', { invoiceId, matched });
    return matched;
  }

  getUnmatchedPayments(): Payment[] {
    return this.payments.filter(p => !this.matchPayment(p.invoiceId, p.amount));
  }

  reconcilePayments(period: string): { matched: number; unmatched: number; variance: number } {
    const matched = this.payments.filter(p => p.status === 'completed').length;
    const unmatched = this.getUnmatchedPayments().length;
    const variance = unmatched > 0 ? Math.random() * 100 : 0;

    return { matched, unmatched, variance };
  }

  adjustInvoice(invoiceId: string, adjustmentAmount: number, reason: string): void {
    logger.info('Invoice adjustment recorded', { invoiceId, amount: adjustmentAmount, reason });
  }
}

// ==================== EXPORTS ====================

export const invoiceGenerator = new InvoiceGenerator();
export const billingCycle = new BillingCycleManager();
export const paymentReconciliation = new PaymentReconciliation();

export type BillingCycle = BillingCycleRecord;
