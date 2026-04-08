/**
 * useQuotaCheck Hook
 * Check and monitor quota usage for features
 */

import { useState, useEffect } from 'react';
import type { QuotaFeature } from '../lib/usage-tracking';

export interface QuotaStatus {
  canUse: boolean;
  current: number;
  limit: number | null;
  remaining: number | null;
}

interface UseQuotaCheckResult {
  quota: QuotaStatus | null;
  loading: boolean;
  error: string | null;
  isWarning: boolean;
  isExceeded: boolean;
}

/**
 * Hook to check quota for a feature
 */
export function useQuotaCheck(feature: QuotaFeature): UseQuotaCheckResult {
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkQuota = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/user/quotas');

        if (!response.ok) {
          throw new Error('Failed to check quota');
        }

        const data = await response.json() as any;

        if (data.success && data.quotas) {
          const featureQuota = data.quotas.find((q: any) => q.feature === feature);

          if (featureQuota) {
            setQuota({
              canUse: featureQuota.limit === null || featureQuota.current < featureQuota.limit,
              current: featureQuota.current,
              limit: featureQuota.limit,
              remaining: featureQuota.remaining,
            });
          } else {
            // Feature not found, assume unlimited
            setQuota({
              canUse: true,
              current: 0,
              limit: null,
              remaining: null,
            });
          }
        }

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check quota');
        // Fail open - allow usage on error
        setQuota({
          canUse: true,
          current: 0,
          limit: null,
          remaining: null,
        });
      } finally {
        setLoading(false);
      }
    };

    checkQuota();
  }, [feature]);

  const isWarning = quota ? (
    quota.limit !== null && quota.current >= quota.limit * 0.8
  ) : false;

  const isExceeded = quota ? !quota.canUse : false;

  return {
    quota,
    loading,
    error,
    isWarning,
    isExceeded,
  };
}

/**
 * Hook to check multiple quotas at once
 */
export function useQuotasCheck(features: QuotaFeature[]): {
  quotas: Record<QuotaFeature, QuotaStatus>;
  loading: boolean;
  error: string | null;
  anyWarning: boolean;
  anyExceeded: boolean;
} {
  const [quotas, setQuotas] = useState<Record<QuotaFeature, QuotaStatus>>({} as any);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkQuotas = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/user/quotas');

        if (!response.ok) {
          throw new Error('Failed to check quotas');
        }

        const data = await response.json() as any;

        if (data.success && data.quotas) {
          const quotaMap: any = {};

          features.forEach((feature) => {
            const featureQuota = data.quotas.find((q: any) => q.feature === feature);

            if (featureQuota) {
              quotaMap[feature] = {
                canUse: featureQuota.limit === null || featureQuota.current < featureQuota.limit,
                current: featureQuota.current,
                limit: featureQuota.limit,
                remaining: featureQuota.remaining,
              };
            } else {
              quotaMap[feature] = {
                canUse: true,
                current: 0,
                limit: null,
                remaining: null,
              };
            }
          });

          setQuotas(quotaMap);
        }

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check quotas');
        // Fail open
        const defaultQuotas: any = {};
        features.forEach((feature) => {
          defaultQuotas[feature] = {
            canUse: true,
            current: 0,
            limit: null,
            remaining: null,
          };
        });
        setQuotas(defaultQuotas);
      } finally {
        setLoading(false);
      }
    };

    if (features.length > 0) {
      checkQuotas();
    }
  }, [features.join(',')]);

  const anyWarning = Object.values(quotas).some(
    (q) => q.limit !== null && q.current >= q.limit * 0.8
  );

  const anyExceeded = Object.values(quotas).some((q) => !q.canUse);

  return {
    quotas,
    loading,
    error,
    anyWarning,
    anyExceeded,
  };
}
