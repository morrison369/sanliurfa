import { describe, expect, it } from 'vitest';
import { traceCollector } from '../apm';
import { forensicAnalyzer, incidentDetector } from '../security-incidents';
import { generateId } from '../utils';
import { billingCycle, invoiceGenerator, paymentReconciliation } from '../invoicing-billing';
import { createInvoiceFromCycle, generateInvoiceNumber, refundManager } from '../payment-billing';
import { payoutProcessor } from '../payout-engine';
import { autoML, featureEngineering, mlPipelineBuilder } from '../ml-pipelines';
import { nlpProcessor, sentimentAnalyzer } from '../nlp-engine';
import { contentPersonalizer, userContextBuilder } from '../personalization-engine';

describe('Runtime determinism wave 9', () => {
  it('uses secure identifiers for trace, invoices, payouts and generated ids', () => {
    const span = traceCollector.startSpan('http-request');
    expect(span.traceId).toMatch(/^trace-/);
    expect(span.spanId).toMatch(/^span-/);

    const invoice = invoiceGenerator.createInvoice({
      customerId: 'cust-1',
      amount: 1250,
      taxAmount: 225,
      status: 'draft',
      dueDate: 1704067200000
    });
    expect(invoice.id).toMatch(/^inv-/);

    const cycle = billingCycle.createCycle({
      customerId: 'cust-1',
      frequency: 'monthly',
      nextBillingDate: 1704067200000,
      amount: 499
    });
    expect(cycle.id).toMatch(/^cycle-/);

    const payout = payoutProcessor.createPayout('vendor-1', 2500, 1704067200000);
    expect(payout.id).toMatch(/^payout-/);

    expect(generateInvoiceNumber()).toMatch(/^\d{4}-\d{2}-\d{6}$/);
    expect(generateId(12)).toMatch(/^[a-z0-9]{12}$/);
  });

  it('keeps billing reconciliation deterministic for the same payment set', () => {
    paymentReconciliation.recordPayment({
      id: 'payment-1',
      invoiceId: 'invoice-1',
      amount: 42,
      method: 'credit_card',
      status: 'completed'
    });

    const resultA = paymentReconciliation.reconcilePayments('2026-04');
    const resultB = paymentReconciliation.reconcilePayments('2026-04');

    expect(resultA).toEqual(resultB);

    const generatedInvoice = createInvoiceFromCycle(
      {
        id: 'cycle-1',
        subscriptionId: 'sub-1',
        startDate: 1704067200000,
        endDate: 1706659200000,
        amount: 199,
        currency: 'TRY',
        status: 'pending'
      },
      [{ description: 'Monthly plan', quantity: 1, unitPrice: 199, total: 199 }]
    );

    expect(generatedInvoice.id).toMatch(/^\d{4}-\d{2}-\d{6}$/);

    const refund = refundManager.createRefund('tx-1', 'sub-1', 100, 'user_request');
    expect(refund.id).toMatch(/^REF-/);
  });

  it('keeps ML and NLP outputs deterministic for the same inputs', () => {
    const pipeline = mlPipelineBuilder.createPipeline({
      name: 'Customer churn',
      version: 'v1',
      stages: ['data-ingestion', 'evaluation'],
      parameters: {},
      status: 'draft'
    });

    const stageA = mlPipelineBuilder.executeStage(pipeline.id, 'evaluation');
    const stageB = mlPipelineBuilder.executeStage(pipeline.id, 'evaluation');
    expect(stageA.recordsProcessed).toBe(stageB.recordsProcessed);
    expect(stageA.dataQuality).toBe(stageB.dataQuality);

    const featureSetA = featureEngineering.extractFeatures('dataset-1', { transformations: ['normalize'] });
    const featureSetB = featureEngineering.extractFeatures('dataset-1', { transformations: ['normalize'] });
    expect(featureSetA.features).toEqual(featureSetB.features);

    expect(featureEngineering.analyzeFeatureImportance('model-1')).toEqual(
      featureEngineering.analyzeFeatureImportance('model-1')
    );
    expect(autoML.autoTuneHyperparameters('model-1')).toEqual(
      autoML.autoTuneHyperparameters('model-1')
    );
    expect(autoML.recommendOptimalModel(['rf', 'gbm', 'svm'])).toBe(
      autoML.recommendOptimalModel(['rf', 'gbm', 'svm'])
    );
    expect(autoML.autoFeatureSelect('fs-1', 'target')).toEqual(
      autoML.autoFeatureSelect('fs-1', 'target')
    );

    expect(nlpProcessor.generateEmbeddings('merhaba dunya').slice(0, 10)).toEqual(
      nlpProcessor.generateEmbeddings('merhaba dunya').slice(0, 10)
    );
    expect(nlpProcessor.compareTextSimilarity('merhaba dunya', 'merhaba sanliurfa')).toBe(
      nlpProcessor.compareTextSimilarity('merhaba dunya', 'merhaba sanliurfa')
    );
    expect(sentimentAnalyzer.analyzeSentiment('harika bir deneyim')).toEqual(
      sentimentAnalyzer.analyzeSentiment('harika bir deneyim')
    );
  });

  it('keeps personalization choices deterministic while 2FA outputs stay securely formatted', () => {
    const context = userContextBuilder.buildContext('user-1', {
      timeOfDay: 10,
      deviceType: 'mobile',
      visitCount: 12,
      lastVisit: Date.now() - 60_000,
      preferredCategories: ['food'],
      location: 'Sanliurfa'
    });

    contentPersonalizer.registerContent('homepage-hero', [
      { id: 'variant-a', content: 'A', weight: 0.6, targetSegments: ['regular'] },
      { id: 'variant-b', content: 'B', weight: 0.4, targetSegments: ['regular'] }
    ]);

    expect(contentPersonalizer.selectVariant('homepage-hero', context)).toEqual(
      contentPersonalizer.selectVariant('homepage-hero', context)
    );

    process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@127.0.0.1:5432/sanliurfa';

    return import('../two-factor').then(({ generateBackupCodes, generateTOTPSecret }) => {
      const secret = generateTOTPSecret('user@example.com');
      expect(secret.secret).toMatch(/^[A-Z2-7]{32}$/);
      expect(secret.qrCodeUrl).toContain('otpauth://totp/');

      const backupCodes = generateBackupCodes(4);
      expect(backupCodes).toHaveLength(4);
      backupCodes.forEach(code => expect(code).toMatch(/^\d{4}-\d{4}$/));

      const incident = incidentDetector.detectIncident({ severity: 'high', affectedAssets: ['db-1'] });
      const evidence = forensicAnalyzer.collectEvidence(incident.incidentId, 'log', 'auth', 'payload');
      expect(evidence.hash).toMatch(/^sha256-/);
    });
  });
});
