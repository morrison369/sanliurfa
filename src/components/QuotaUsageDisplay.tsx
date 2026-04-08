/**
 * Quota Usage Display Component
 * Show user's feature quotas and usage
 */

import React, { useState, useEffect } from 'react';

interface QuotaItem {
  feature: string;
  current: number;
  limit: number | null;
  remaining: number | null;
  percentageUsed: number;
  resetDate: string | null;
  message: string;
}

interface QuotaResponse {
  success: boolean;
  tier: { name: string; level: number } | null;
  quotas: QuotaItem[];
  summary: {
    totalQuotas: number;
    limitedQuotas: number;
    unlimitedQuotas: number;
  };
}

interface QuotaUsageDisplayProps {
  compact?: boolean;
}

export default function QuotaUsageDisplay({ compact = false }: QuotaUsageDisplayProps) {
  const [data, setData] = useState<QuotaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuotas = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/user/quotas');

        if (!response.ok) {
          throw new Error('Failed to fetch quotas');
        }

        const quotaData = await response.json() as QuotaResponse;
        setData(quotaData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load quotas');
      } finally {
        setLoading(false);
      }
    };

    fetchQuotas();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
      </div>
    );
  }

  if (!data || data.quotas.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
        <p className="text-gray-600 dark:text-gray-400 text-sm">Kota bilgisi yüklenmedi</p>
      </div>
    );
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getWarningColor = (percentage: number) => {
    if (percentage >= 100) return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20';
    if (percentage >= 80) return 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20';
    return '';
  };

  const limitedQuotas = data.quotas.filter((q) => q.limit !== null);

  if (compact && limitedQuotas.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {compact ? (
        // Compact view - only show limited features
        <div className="space-y-3">
          {limitedQuotas.map((quota) => (
            <div
              key={quota.feature}
              className={`rounded-lg p-3 border ${getWarningColor(quota.percentageUsed)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {quota.feature}
                </span>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {quota.current}/{quota.limit}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getProgressColor(quota.percentageUsed)}`}
                  style={{ width: `${Math.min(quota.percentageUsed, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{quota.message}</p>
            </div>
          ))}
        </div>
      ) : (
        // Full view - show all quotas
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Kullanım Kotaları
          </h3>
          <div className="space-y-4">
            {data.quotas.map((quota) => (
              <div
                key={quota.feature}
                className={`rounded-lg p-4 border ${getWarningColor(quota.percentageUsed)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {quota.feature}
                    </h4>
                    {quota.limit !== null && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {quota.message}
                      </p>
                    )}
                    {quota.limit === null && (
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Sınırsız ✓
                      </p>
                    )}
                  </div>
                  {quota.limit !== null && (
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {quota.current}/{quota.limit}
                    </span>
                  )}
                </div>

                {quota.limit !== null && (
                  <>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2">
                      <div
                        className={`h-2.5 rounded-full transition-all ${getProgressColor(
                          quota.percentageUsed
                        )}`}
                        style={{ width: `${Math.min(quota.percentageUsed, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>{quota.percentageUsed}% kullanılmış</span>
                      {quota.resetDate && (
                        <span>
                          Sıfırlanma:{' '}
                          {new Date(quota.resetDate).toLocaleDateString('tr-TR')}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {data.tier && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-300">
                <span className="font-semibold">Mevcut plan:</span> {data.tier.name}
              </p>
              {limitedQuotas.length > 0 && (
                <p className="text-sm text-blue-800 dark:text-blue-400 mt-2">
                  Premium plana yükseltin ve tüm kotalı özelliklere sınırsız erişim elde edin.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
