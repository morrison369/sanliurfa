import React, { useState, useEffect } from 'react';

interface Metrics {
  requestCount: number;
  errorCount: number;
  slowRequestCount: number;
  avgDuration: number;
  p95Duration: number;
  cacheHitRate: number;
  slowestEndpoints: Array<{ path: string; avgDuration: number; count: number }>;
  slowQueries: Array<{ sql: string; duration: number; count: number; timestamp: string }>;
  poolStatus?: {
    active: number;
    idle: number;
    waiting: number;
    size: number;
  };
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadMetrics();
    if (autoRefresh) {
      const interval = setInterval(loadMetrics, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadMetrics = async () => {
    try {
      const res = await fetch('/api/metrics');
      if (!res.ok) throw new Error('Failed to load metrics');
      const data = await res.json();
      setMetrics(data.data || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container-custom py-8">
        <div className="text-center text-gray-600">Yükleniyor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-custom py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-900">
          {error}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="container-custom py-8">
        <div className="text-center text-gray-600">Veri bulunamadı</div>
      </div>
    );
  }

  const errorRate = metrics.requestCount > 0
    ? ((metrics.errorCount / metrics.requestCount) * 100).toFixed(2)
    : '0';

  const slowRequestRate = metrics.requestCount > 0
    ? ((metrics.slowRequestCount / metrics.requestCount) * 100).toFixed(2)
    : '0';

  return (
    <div className="container-custom py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Sistem metrikleri ve performans monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Otomatik yenile (5s)
          </label>
          <button
            onClick={loadMetrics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Yenile
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Requests */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Toplam İstekler</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{metrics.requestCount.toLocaleString()}</div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">Son saat</div>
        </div>

        {/* Error Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Hata Oranı</div>
          <div className={`text-3xl font-bold ${Number(errorRate) > 5 ? 'text-red-600' : 'text-green-600'}`}>
            {errorRate}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">{metrics.errorCount} hata</div>
        </div>

        {/* Avg Duration */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Ort. Süre</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{Math.round(metrics.avgDuration)}ms</div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">P95: {Math.round(metrics.p95Duration)}ms</div>
        </div>

        {/* Cache Hit Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Cache Hit Rate</div>
          <div className="text-3xl font-bold text-blue-600">{(metrics.cacheHitRate * 100).toFixed(1)}%</div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">{metrics.slowRequestRate || 0} slow</div>
        </div>
      </div>

      {/* Slow Requests Rate */}
      {metrics.slowRequestCount > 0 && (
        <div className="mb-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <div className="font-semibold text-amber-900 dark:text-amber-100">{metrics.slowRequestCount} yavaş istek ({slowRequestRate}%)</div>
              <div className="text-sm text-amber-800 dark:text-amber-200">500ms'den uzun istekler incelenmelidir</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Slowest Endpoints */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">En Yavaş Endpointler</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Endpoint</th>
                  <th className="px-6 py-3 text-right font-semibold">Ort. Süre</th>
                  <th className="px-6 py-3 text-right font-semibold">İstek</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {metrics.slowestEndpoints.slice(0, 5).map((endpoint) => (
                  <tr key={endpoint.path} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-3 text-gray-900 dark:text-gray-100 font-mono text-xs">{endpoint.path}</td>
                    <td className="px-6 py-3 text-right text-gray-600 dark:text-gray-400">{Math.round(endpoint.avgDuration)}ms</td>
                    <td className="px-6 py-3 text-right text-gray-600 dark:text-gray-400">{endpoint.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Database Pool Status */}
        {metrics.poolStatus && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Database Connection Pool</h2>
            </div>
            <div className="px-6 py-6">
              <div className="space-y-6">
                {/* Active Connections */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Aktif Bağlantılar</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {metrics.poolStatus.active} / {metrics.poolStatus.size}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${(metrics.poolStatus.active / metrics.poolStatus.size) * 100}%`
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {((metrics.poolStatus.active / metrics.poolStatus.size) * 100).toFixed(0)}% kullanım
                  </div>
                </div>

                {/* Idle Connections */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Boşta Bağlantılar</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{metrics.poolStatus.idle}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${(metrics.poolStatus.idle / metrics.poolStatus.size) * 100}%`
                      }}
                    />
                  </div>
                </div>

                {/* Waiting Connections */}
                {metrics.poolStatus.waiting > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Bekleyen İstekler</span>
                      <span className="text-sm font-bold text-red-600">{metrics.poolStatus.waiting}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-red-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${(metrics.poolStatus.waiting / metrics.poolStatus.size) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Slow Queries */}
      {metrics.slowQueries.length > 0 && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Yavaş Sorgular</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">SQL</th>
                  <th className="px-6 py-3 text-right font-semibold">Süre</th>
                  <th className="px-6 py-3 text-right font-semibold">Tekrar</th>
                  <th className="px-6 py-3 text-right font-semibold">Zaman</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {metrics.slowQueries.slice(0, 10).map((query, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-3 text-gray-900 dark:text-gray-100 font-mono text-xs max-w-xs truncate">
                      {query.sql}
                    </td>
                    <td className="px-6 py-3 text-right text-red-600 dark:text-red-400 font-bold">{query.duration}ms</td>
                    <td className="px-6 py-3 text-right text-gray-600 dark:text-gray-400">{query.count}x</td>
                    <td className="px-6 py-3 text-right text-gray-500 dark:text-gray-500 text-xs">
                      {new Date(query.timestamp).toLocaleTimeString('tr-TR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
