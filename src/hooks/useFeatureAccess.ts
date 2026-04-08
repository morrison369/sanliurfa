/**
 * useFeatureAccess Hook
 * Check if user has access to premium features
 */

import { useState, useEffect } from 'react';
import type { FeatureName } from '../lib/feature-gating';

interface UseFeatureAccessResult {
  hasAccess: boolean;
  loading: boolean;
  error: string | null;
  tier: { name: string; level: number } | null;
}

/**
 * Hook to check access to a single feature
 */
export function useFeatureAccess(feature: FeatureName): UseFeatureAccessResult {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState<{ name: string; level: number } | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/user/features', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            features: [feature],
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to check feature access');
        }

        const data = await response.json() as any;

        if (data.success && data.features && data.features.length > 0) {
          setHasAccess(data.features[0].hasAccess);
        }

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check feature access');
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [feature]);

  return { hasAccess, loading, error, tier };
}

/**
 * Hook to check access to multiple features
 */
export function useFeaturesAccess(features: FeatureName[]): {
  access: Record<string, boolean>;
  loading: boolean;
  error: string | null;
  tier: { name: string; level: number } | null;
} {
  const [access, setAccess] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState<{ name: string; level: number } | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/user/features', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            features,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to check features access');
        }

        const data = await response.json() as any;

        if (data.success && data.features) {
          const accessMap: Record<string, boolean> = {};
          data.features.forEach((f: any) => {
            accessMap[f.feature] = f.hasAccess;
          });
          setAccess(accessMap);
        }

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check features access');
      } finally {
        setLoading(false);
      }
    };

    if (features.length > 0) {
      checkAccess();
    }
  }, [features.join(',')]);

  return { access, loading, error, tier };
}
