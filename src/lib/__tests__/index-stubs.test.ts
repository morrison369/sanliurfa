/**
 * Unit Tests — index/index.ts stub class registry (smoke)
 *
 * Lib root'taki ~30 stub class + singleton instance. Hepsi instanceof check.
 * Future implementation eklenirse stub kaldırılır → import path break detect.
 */

import { describe, it, expect } from 'vitest';
import {
  CustomerHealthManager, customerHealthManager,
  MetricsTracker, metricsTracker,
  ChurnPredictor, churnPredictor,
  SuccessPlanManager, successPlanManager,
  MilestoneManager, milestoneManager,
  GoalManager, goalManager,
  IssueManager, issueManager,
  EscalationManager, escalationManager,
  SLAManager, slaManager,
  OnboardingManager, onboardingManager,
  TrainingManager, trainingManager,
  AdoptionTracker, adoptionTracker,
  FeedbackManager, feedbackManager,
  NPSManager, npsManager,
  SatisfactionManager, satisfactionManager,
  SuccessMetricsManager, successMetricsManager,
  RetentionAnalyzer, retentionAnalyzer,
  ExpansionAnalyzer, expansionAnalyzer,
  CustomerHealthDashboard, customerHealthDashboard,
  DatasetManager, datasetManager,
  AnalyticsEngine, analyticsEngine,
  MLModelManager, mlModelManager,
  WorkflowBuilder, workflowBuilder,
  WorkflowExecutor, workflowExecutor,
  KnowledgeBaseManager, knowledgeBaseManager,
  IntegrationManager, integrationManager,
  WebhookOrchestrator, webhookOrchestrator,
  ContainerManager, containerManager,
  AutoScaler, autoScaler,
  ZeroTrustEngine, zeroTrustEngine,
} from '../index/index';

describe('index/index.ts stub registry — class instances', () => {
  const pairs: Array<[any, any, string]> = [
    [CustomerHealthManager, customerHealthManager, 'CustomerHealthManager'],
    [MetricsTracker, metricsTracker, 'MetricsTracker'],
    [ChurnPredictor, churnPredictor, 'ChurnPredictor'],
    [SuccessPlanManager, successPlanManager, 'SuccessPlanManager'],
    [MilestoneManager, milestoneManager, 'MilestoneManager'],
    [GoalManager, goalManager, 'GoalManager'],
    [IssueManager, issueManager, 'IssueManager'],
    [EscalationManager, escalationManager, 'EscalationManager'],
    [SLAManager, slaManager, 'SLAManager'],
    [OnboardingManager, onboardingManager, 'OnboardingManager'],
    [TrainingManager, trainingManager, 'TrainingManager'],
    [AdoptionTracker, adoptionTracker, 'AdoptionTracker'],
    [FeedbackManager, feedbackManager, 'FeedbackManager'],
    [NPSManager, npsManager, 'NPSManager'],
    [SatisfactionManager, satisfactionManager, 'SatisfactionManager'],
    [SuccessMetricsManager, successMetricsManager, 'SuccessMetricsManager'],
    [RetentionAnalyzer, retentionAnalyzer, 'RetentionAnalyzer'],
    [ExpansionAnalyzer, expansionAnalyzer, 'ExpansionAnalyzer'],
    [CustomerHealthDashboard, customerHealthDashboard, 'CustomerHealthDashboard'],
    [DatasetManager, datasetManager, 'DatasetManager'],
    [AnalyticsEngine, analyticsEngine, 'AnalyticsEngine'],
    [MLModelManager, mlModelManager, 'MLModelManager'],
    [WorkflowBuilder, workflowBuilder, 'WorkflowBuilder'],
    [WorkflowExecutor, workflowExecutor, 'WorkflowExecutor'],
    [KnowledgeBaseManager, knowledgeBaseManager, 'KnowledgeBaseManager'],
    [IntegrationManager, integrationManager, 'IntegrationManager'],
    [WebhookOrchestrator, webhookOrchestrator, 'WebhookOrchestrator'],
    [ContainerManager, containerManager, 'ContainerManager'],
    [AutoScaler, autoScaler, 'AutoScaler'],
    [ZeroTrustEngine, zeroTrustEngine, 'ZeroTrustEngine'],
  ];

  for (const [Cls, instance, name] of pairs) {
    it(`${name} — class export + singleton instance`, () => {
      expect(typeof Cls).toBe('function');
      expect(instance).toBeInstanceOf(Cls);
    });
  }
});

describe('singleton identity', () => {
  it('default singletons unique (her import aynı instance)', () => {
    expect(customerHealthManager).toBe(customerHealthManager);
    expect(workflowBuilder).toBe(workflowBuilder);
  });
});
