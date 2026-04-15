/**
 * Advanced Digital Experience & Personalization (Phase 173-178)
 * Test suite for journey orchestration, personalization, A/B testing,
 * content optimization, UX analytics, and conversion intelligence
 */

import { describe, it, expect } from 'vitest';
import {
  journeyBuilder, journeyProgressTracker, journeyTriggerEngine, journeyAnalytics,
  personalizationEngine, userContextManager, contentVariantSelector, personalizationCache,
  experimentDesigner, variantAssigner, experimentMetricsCollector, experimentAnalyzer,
  contentScorer, contentRecommender, contentPerformanceTracker, contentOptimizationSuggester,
  userSessionAnalyzer, heatmapTracker, funnelAnalyzer, uxQualityScorer,
  conversionPredictor, conversionOptimizer, abandonmentDetector, revenueAttributionTracker
} from '../index';

// Phase 173: Journey Orchestration
describe('Phase 173: Journey Orchestration', () => {
  it('should build and activate journeys with steps', () => {
    const journey = journeyBuilder.createJourney('onboarding', 'user.signup', { plan: 'free' });
    expect(journey.status).toBe('draft');

    journeyBuilder.addStep(journey.journeyId, { name: 'Welcome Email', type: 'email', content: { subject: 'Welcome!' } });
    journeyBuilder.addStep(journey.journeyId, { name: 'Wait 1 day', type: 'wait', delayMs: 86400000 });

    const activated = journeyBuilder.activateJourney(journey.journeyId);
    expect(activated?.status).toBe('active');
    expect(activated?.steps.length).toBe(2);
  });

  it('should track user progress through journey steps', () => {
    const journey = journeyBuilder.createJourney('retention', 'user.inactive', {});
    journeyBuilder.addStep(journey.journeyId, { name: 'Push Notification', type: 'push' });
    journeyBuilder.activateJourney(journey.journeyId);

    const firstStepId = journeyBuilder.getJourney(journey.journeyId)!.steps[0].stepId;
    const progress = journeyProgressTracker.enroll(journey.journeyId, 'user-123', firstStepId);
    expect(progress.status).toBe('active');

    const completed = journeyProgressTracker.complete(progress.progressId);
    expect(completed?.status).toBe('completed');
  });

  it('should trigger journeys based on events', () => {
    journeyTriggerEngine.registerTrigger('purchase.completed', { minValue: 100 }, 'journey-vip');
    const matched = journeyTriggerEngine.evaluate('purchase.completed', { minValue: 100, userId: 'user-456' });
    expect(matched).toContain('journey-vip');

    const noMatch = journeyTriggerEngine.evaluate('purchase.completed', { minValue: 50 });
    expect(noMatch).not.toContain('journey-vip');
  });

  it('should analyze journey conversion rates', () => {
    const journeys = [
      { progressId: 'p1', journeyId: 'j1', userId: 'u1', currentStepId: 's1', startedAt: Date.now() - 3600000, lastUpdatedAt: Date.now(), status: 'completed' as const, stepsCompleted: ['s1', 's2'] },
      { progressId: 'p2', journeyId: 'j1', userId: 'u2', currentStepId: 's1', startedAt: Date.now() - 7200000, lastUpdatedAt: Date.now(), status: 'exited' as const, stepsCompleted: ['s1'] }
    ];

    const metrics = journeyAnalytics.getConversionRate(journeys);
    expect(metrics.enrolled).toBe(2);
    expect(metrics.completed).toBe(1);
    expect(metrics.rate).toBe(50);
  });
});

// Phase 174: Real-time Personalization
describe('Phase 174: Real-time Personalization', () => {
  it('should personalize content based on user segments', () => {
    const context = userContextManager.createContext('user-123', 'sess-abc', ['premium', 'sports']);

    contentVariantSelector.registerVariant('hero-banner', 'Premium Banner', ['premium'], { image: 'premium.jpg' }, 9);
    contentVariantSelector.registerVariant('hero-banner', 'Default Banner', [], { image: 'default.jpg' }, 5);

    const variants = contentVariantSelector.getVariantsForContent('hero-banner');
    const decision = personalizationEngine.personalize('user-123', 'hero-banner', context, variants);
    expect(decision.variantId).toBeDefined();
    expect(decision.score).toBeGreaterThan(0);
  });

  it('should manage real-time user context with event recording', () => {
    userContextManager.createContext('user-456', 'sess-xyz', ['new_user']);
    userContextManager.recordEvent('user-456', 'product.view', { productId: 'p-123' });
    userContextManager.updateContext('user-456', { segments: ['interested_buyer'] });

    const ctx = userContextManager.getContext('user-456');
    expect(ctx?.segments).toContain('interested_buyer');
    expect(ctx?.recentEvents.length).toBe(1);
  });

  it('should cache and invalidate personalization decisions', () => {
    const context = userContextManager.createContext('user-789', 'sess-def', ['vip']);
    const variant = contentVariantSelector.registerVariant('offer', 'VIP Offer', ['vip'], { discount: 20 }, 10);
    const decision = personalizationEngine.personalize('user-789', 'offer', context, [variant]);

    personalizationCache.set('user-789', 'offer', decision);
    const cached = personalizationCache.get('user-789', 'offer');
    expect(cached?.decisionId).toBe(decision.decisionId);

    const count = personalizationCache.invalidateUser('user-789');
    expect(count).toBe(1);
    expect(personalizationCache.get('user-789', 'offer')).toBeNull();
  });

  it('should select best content variant by segment match', () => {
    contentVariantSelector.registerVariant('cta-button', 'Trial CTA', ['student'], { text: 'Start Free Trial' }, 8);
    contentVariantSelector.registerVariant('cta-button', 'Buy CTA', ['business'], { text: 'Get Started' }, 7);

    const best = contentVariantSelector.selectBestVariant('cta-button', ['business']);
    expect(best?.name).toBe('Buy CTA');
  });
});

// Phase 175: A/B Testing & Experimentation
describe('Phase 175: A/B Testing & Experimentation', () => {
  it('should design, launch, and analyze experiments', () => {
    const exp = experimentDesigner.design('cta-test', 'Green CTA increases clicks', 'click_rate');
    experimentDesigner.addVariant(exp.experimentId, 'Control (Blue)', 50, { color: 'blue' });
    experimentDesigner.addVariant(exp.experimentId, 'Variant (Green)', 50, { color: 'green' });

    const launched = experimentDesigner.launch(exp.experimentId);
    expect(launched?.status).toBe('running');
    expect(launched?.variants.length).toBe(2);
  });

  it('should assign users to experiment variants consistently', () => {
    const exp = experimentDesigner.design('price-test', 'Price display affects conversion', 'conversion');
    experimentDesigner.addVariant(exp.experimentId, 'Original', 50, { price: '$99' });
    experimentDesigner.addVariant(exp.experimentId, 'Reduced', 50, { price: '$79' });
    const launched = experimentDesigner.launch(exp.experimentId)!;

    const assignment1 = variantAssigner.assign('user-consistent', launched);
    const assignment2 = variantAssigner.assign('user-consistent', launched);
    // Same user always gets same variant
    expect(assignment1?.variantId).toBe(assignment2?.variantId);
  });

  it('should collect metrics and detect statistical significance', () => {
    const result = experimentAnalyzer.analyze('exp-test-001', 'conversion_rate', {
      'variant-control': [0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
      'variant-treatment': [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1]
    });

    expect(result.winner).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.variantResults).toHaveProperty('variant-control');
  });

  it('should check sample size adequacy', () => {
    const adequate = experimentAnalyzer.checkSampleSizeAdequacy(1000, 1250);
    expect(adequate.adequate).toBe(true);

    const insufficient = experimentAnalyzer.checkSampleSizeAdequacy(1000, 400);
    expect(insufficient.adequate).toBe(false);
    expect(insufficient.completion).toBe(40);
  });
});

// Phase 176: Content Optimization
describe('Phase 176: Content Optimization', () => {
  it('should score and rank content', () => {
    const score1 = contentScorer.score('article-001', 85, 2, 800, true);
    const score2 = contentScorer.score('article-002', 60, 30, 200, false);

    expect(score1.overallScore).toBeGreaterThan(score2.overallScore);
    const top = contentScorer.getTopContent(1);
    expect(top[0].contentId).toBe('article-001');
  });

  it('should track content performance and generate suggestions', () => {
    contentPerformanceTracker.recordImpression('content-001');
    contentPerformanceTracker.recordImpression('content-001');
    contentPerformanceTracker.recordImpression('content-001');
    contentPerformanceTracker.recordClick('content-001');

    const perf = contentPerformanceTracker.getPerformance('content-001');
    expect(perf?.views).toBe(3);
    expect(perf?.ctr).toBeGreaterThan(0);

    const suggestions = contentOptimizationSuggester.generateSuggestions('content-001', perf!);
    expect(Array.isArray(suggestions)).toBe(true);
  });

  it('should recommend content for users', () => {
    contentScorer.score('article-reco-1', 90, 1, 600, true);
    contentScorer.score('article-reco-2', 75, 5, 400, false);
    const allScores = contentScorer.getTopContent(10);

    const recommendations = contentRecommender.recommend('user-123', ['sports'], allScores, 2);
    expect(recommendations.length).toBeLessThanOrEqual(2);
  });

  it('should find similar content', () => {
    contentScorer.score('base-content', 80, 3, 500, true);
    contentScorer.score('similar-1', 78, 4, 480, true);
    contentScorer.score('similar-2', 40, 20, 200, false);
    const allScores = contentScorer.getTopContent(10);

    const similar = contentRecommender.getSimilarContent('base-content', allScores, 2);
    expect(similar.length).toBeGreaterThan(0);
  });
});

// Phase 177: UX Analytics
describe('Phase 177: UX Analytics', () => {
  it('should track sessions and calculate bounce rates', () => {
    const session = userSessionAnalyzer.startSession('user-001', 'desktop', '/home');
    userSessionAnalyzer.recordPageView(session.sessionId, '/products');
    userSessionAnalyzer.recordInteraction(session.sessionId);
    userSessionAnalyzer.endSession(session.sessionId);

    const metrics = userSessionAnalyzer.getSessionMetrics();
    expect(metrics.avgPageViews).toBeGreaterThan(0);
    expect(typeof metrics.bounceRate).toBe('number');
  });

  it('should record interactions and generate heatmap data', () => {
    heatmapTracker.record('sess-001', '/landing', 'hero-cta', 450, 320, 'click');
    heatmapTracker.record('sess-002', '/landing', 'hero-cta', 460, 330, 'click');
    heatmapTracker.record('sess-003', '/landing', 'nav-logo', 50, 30, 'click');

    const heatmap = heatmapTracker.getHeatmapData('/landing', 'click');
    expect(heatmap.length).toBeGreaterThan(0);

    const topElements = heatmapTracker.getTopElements('/landing', 2);
    expect(topElements[0].elementId).toBe('hero-cta');
  });

  it('should analyze conversion funnels', () => {
    funnelAnalyzer.defineFunnel('checkout', [
      { name: 'Product View', pageId: '/product' },
      { name: 'Add to Cart', pageId: '/cart' },
      { name: 'Checkout', pageId: '/checkout' },
      { name: 'Purchase', pageId: '/thank-you' }
    ]);

    funnelAnalyzer.recordStepCompletion('checkout', funnelAnalyzer.getFunnelMetrics('checkout')[0].stepId, 'user-A');
    funnelAnalyzer.recordStepCompletion('checkout', funnelAnalyzer.getFunnelMetrics('checkout')[0].stepId, 'user-B');

    const metrics = funnelAnalyzer.getFunnelMetrics('checkout');
    expect(metrics.length).toBe(4);
    expect(metrics[0].conversionRate).toBe(100);
  });

  it('should calculate UX quality score', () => {
    const result = uxQualityScorer.scoreUX(
      { avgDurationMs: 180000, avgPageViews: 4, bounceRate: 35 },
      72,
      28
    );
    expect(result.score).toBeGreaterThan(0);
    expect(result.grade).toMatch(/A|B|C|D|F/);
    expect(result.breakdown).toHaveProperty('bounceScore');
  });
});

// Phase 178: Conversion Intelligence
describe('Phase 178: Conversion Intelligence', () => {
  it('should predict conversion probability from signals', () => {
    const prediction = conversionPredictor.predict('user-hot', [
      { name: 'cart_value', value: 0.8, weight: 0.4 },
      { name: 'sessions', value: 0.9, weight: 0.3 },
      { name: 'time_on_site', value: 0.85, weight: 0.3 }
    ]);

    expect(prediction.probability).toBeGreaterThan(0.5);
    const category = conversionPredictor.categorizeLead(prediction.probability);
    expect(category).toMatch(/hot|warm|cold/);
  });

  it('should select and track conversion optimization actions', () => {
    const action = conversionOptimizer.selectAction('user-cold', 0.2, 75);
    expect(action.type).toBeDefined();
    expect(action.converted).toBe(false);

    const converted = conversionOptimizer.recordConversion(action.actionId);
    expect(converted).toBe(true);
  });

  it('should detect abandonment and trigger recovery', () => {
    const event = abandonmentDetector.detectAbandonment('user-abandon', 'sess-leave', '/checkout', 89.99);
    expect(event.cartValue).toBe(89.99);
    expect(event.recoveryAttempted).toBe(false);

    const triggered = abandonmentDetector.triggerRecovery(event.eventId);
    expect(triggered).toBe(true);

    const metrics = abandonmentDetector.getAbandonmentMetrics();
    expect(metrics.total).toBeGreaterThan(0);
    expect(metrics.avgCartValue).toBeGreaterThan(0);
  });

  it('should track touchpoints and attribute revenue', () => {
    revenueAttributionTracker.recordTouchpoint('user-attr', 'organic');
    revenueAttributionTracker.recordTouchpoint('user-attr', 'email', 'summer-campaign');
    revenueAttributionTracker.recordTouchpoint('user-attr', 'paid', 'google-ads');

    const attributed = revenueAttributionTracker.attributeConversion('user-attr', 'linear');
    expect(attributed.length).toBe(3);
    expect(attributed.every(tp => tp.attributionWeight > 0)).toBe(true);

    const channelAttrib = revenueAttributionTracker.getChannelAttribution();
    expect(channelAttrib).toHaveProperty('organic');
  });
});
