/**
 * A/B Testing Framework
 * Simple experiment system for feature testing
 */

import { getCache, setCache } from '../cache';
import { logger } from '../logging';

interface Experiment {
  id: string;
  name: string;
  description: string;
  variants: string[];
  weights: number[];
  startDate: Date;
  endDate?: Date;
  status: 'running' | 'paused' | 'completed';
}

interface ExperimentAssignment {
  userId: string;
  experimentId: string;
  variant: string;
  assignedAt: Date;
}

// In-memory store (use Redis in production)
const experiments = new Map<string, Experiment>();
const assignments = new Map<string, ExperimentAssignment>();

/**
 * Create a new experiment
 */
export function createExperiment(
  id: string,
  name: string,
  variants: string[],
  options: Partial<Experiment> = {}
): Experiment {
  const experiment: Experiment = {
    id,
    name,
    description: options.description || '',
    variants,
    weights: options.weights || variants.map(() => 1 / variants.length),
    startDate: options.startDate || new Date(),
    endDate: options.endDate,
    status: options.status || 'running',
  };
  
  experiments.set(id, experiment);
  return experiment;
}

/**
 * Get or create user assignment for an experiment
 */
export async function getVariant(
  userId: string,
  experimentId: string
): Promise<string | null> {
  const experiment = experiments.get(experimentId);
  if (!experiment || experiment.status !== 'running') {
    return null;
  }
  
  // Check if already assigned
  const cacheKey = `experiment:${experimentId}:${userId}`;
  const cached = await getCache<string>(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Assign new variant based on weights
  const variant = assignVariant(experiment);
  
  // Cache assignment
  await setCache(cacheKey, variant, 86400 * 30); // 30 days
  
  // Track assignment
  const assignment: ExperimentAssignment = {
    userId,
    experimentId,
    variant,
    assignedAt: new Date(),
  };
  assignments.set(`${userId}:${experimentId}`, assignment);
  
  return variant;
}

/**
 * Assign variant based on weights
 */
function assignVariant(experiment: Experiment): string {
  const totalWeight = experiment.weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < experiment.variants.length; i++) {
    random -= experiment.weights[i];
    if (random <= 0) {
      return experiment.variants[i];
    }
  }
  
  return experiment.variants[0];
}

/**
 * Track experiment event (conversion, engagement, etc.)
 */
export async function trackEvent(
  userId: string,
  experimentId: string,
  event: string,
  value?: number
): Promise<void> {
  const variant = await getVariant(userId, experimentId);
  if (!variant) return;
  
  // In production, send to analytics (Google Analytics, Mixpanel, etc.)
  logger.info('[Experiment]', {
    experimentId,
    userId,
    variant,
    event,
    value,
    timestamp: new Date().toISOString(),
  });
  
  // Could also send to your analytics endpoint
  // await fetch('/api/analytics/experiment', {
  //   method: 'POST',
  //   body: JSON.stringify({ experimentId, userId, variant, event, value })
  // });
}

/**
 * Get experiment results
 */
export function getResults(experimentId: string): {
  totalAssignments: number;
  variantCounts: Record<string, number>;
} {
  const experiment = experiments.get(experimentId);
  if (!experiment) {
    return { totalAssignments: 0, variantCounts: {} };
  }
  
  const variantCounts: Record<string, number> = {};
  experiment.variants.forEach(v => variantCounts[v] = 0);
  
  let total = 0;
  assignments.forEach((assignment) => {
    if (assignment.experimentId === experimentId) {
      variantCounts[assignment.variant] = (variantCounts[assignment.variant] || 0) + 1;
      total++;
    }
  });
  
  return { totalAssignments: total, variantCounts };
}

/**
 * Stop an experiment
 */
export function stopExperiment(experimentId: string, winner?: string): void {
  const experiment = experiments.get(experimentId);
  if (experiment) {
    experiment.status = 'completed';
    logger.info(`[Experiment] ${experimentId} stopped. Winner: ${winner || 'TBD'}`);
  }
}

/**
 * React hook for experiments (for client-side)
 */
export function useExperiment(userId: string, experimentId: string) {
  // This would be used in React components
  // Returns the variant for the current user
  return {
    variant: null, // Would be fetched from server or localStorage
    track: (event: string, value?: number) => {
      trackEvent(userId, experimentId, event, value);
    },
  };
}

// Initialize default experiments
export function initializeExperiments(): void {
  // Hero section test
  createExperiment(
    'hero-cta',
    'Hero CTA Button Test',
    ['control', 'variant-a', 'variant-b'],
    {
      description: 'Test different hero CTA buttons',
      weights: [0.34, 0.33, 0.33],
    }
  );
  
  // Search placement test
  createExperiment(
    'search-placement',
    'Search Bar Placement',
    ['header', 'hero', 'sticky'],
    {
      description: 'Test search bar placement',
      weights: [0.5, 0.25, 0.25],
    }
  );
  
  // Card layout test
  createExperiment(
    'card-layout',
    'Place Card Layout',
    ['grid', 'list', 'compact'],
    {
      description: 'Test place card layouts',
      weights: [0.4, 0.3, 0.3],
    }
  );
}

// Auto-initialize
initializeExperiments();

