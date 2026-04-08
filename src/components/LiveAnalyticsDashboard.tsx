import React, { useState, useEffect } from 'react';
import { realtimeManager } from '../lib/realtime-sse';

interface MetricsData {
  errorRate: number;
  avgDuration: number;
  p95Duration: number;
  cacheHitRate: number;
  slowRequests: number;
  totalRequests: number;
  slowestEndpoints?: any[];
  dbPool?: {
    active: number;
    idle: number;
    waiting: number;
    utilization: number;
  };
}

interface KPIData {
  kpis: any[];
  alertCount: number;
}

export default function LiveAnalyticsDashboard() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    // Connect to analytics stream
    realtimeManager.connectToAnalytics();
    setConnected(true);

    // Subscribe to metrics updates
    const unsubMetrics = realtimeManager.onAnalyticsMetrics((metricsData) => {
      setMetrics(metricsData);
      setLastUpdate(new Date().toLocaleTimeString('tr-TR'));
    });

    // Subscribe to KPI updates
    const unsubKPI = realtimeManager.onAnalyticsKPI((kpiData) => {
      setKpi(kpiData);
    });

    // Cleanup on unmount
    return () => {
      unsubMetrics();
      unsubKPI();
    };
  }, []);

  // Helper to get color based on error rate
  const getErrorRateColor = (rate: number) => {
    if (rate < 2) return 'text-green-600';
    if (rate < 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Helper to get color based on response time
  const getResponseTimeColor = (ms: number) => {
    if (ms < 200) return 'text-green-600';
    if (ms < 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Helper to get progress bar color
  const getProgressColor = (percent: number, threshold: number) => {
    if (percent < threshold * 0.5) return 'bg-green-500';
    if (percent < threshold) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-700 mb-2">Bağlantı kuruluyor...</div>
          <div className="animate-spin">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with connection status */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Canlı Analitik Gösterge Paneli</h2>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {connected ? 'Canlı' : 'Bağlantısız'}
            {lastUpdate && ` • Son güncelleme: ${lastUpdate}`}
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Error Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Hata Oranı</h3>
          <div className={`text-3xl font-bold ${getErrorRateColor(metrics.errorRate)} mb-3`}>
            {metrics.errorRate.toFixed(2)}%
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${getProgressColor(metrics.errorRate, 5)}`}
              style={{ width: `${Math.min(metrics.errorRate * 20, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {metrics.errorRate < 2 ? '✓ İyi' : metrics.errorRate < 5 ? '⚠ Dikkat' : '✗ Kritik'}
          </p>
        </div>

        {/* Average Response Time */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Ortalama Yanıt Süresi</h3>
          <div className={`text-3xl font-bold ${getResponseTimeColor(metrics.avgDuration)} mb-3`}>
            {metrics.avgDuration}ms
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${getProgressColor(metrics.avgDuration, 500)}`}
              style={{ width: `${Math.min((metrics.avgDuration / 500) * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {metrics.avgDuration < 200 ? '✓ İyi' : metrics.avgDuration < 500 ? '⚠ Normal' : '✗ Yavaş'}
          </p>
        </div>

        {/* P95 Response Time */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">P95 Yanıt Süresi</h3>
          <div className="text-3xl font-bold text-blue-600 mb-3">
            {metrics.p95Duration}ms
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-blue-500 transition-all"
              style={{ width: `${Math.min((metrics.p95Duration / 1000) * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">95. yüzdelik gecikme</p>
        </div>

        {/* Cache Hit Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Önbellek İsabet Oranı</h3>
          <div className="text-3xl font-bold text-green-600 mb-3">
            {metrics.cacheHitRate.toFixed(1)}%
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-green-500 transition-all"
              style={{ width: `${metrics.cacheHitRate}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {metrics.cacheHitRate > 70 ? '✓ Mükemmel' : '⚠ İyileştir'}
          </p>
        </div>

        {/* DB Pool Utilization */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">DB Havuzu Kullanımı</h3>
          <div className={`text-3xl font-bold ${
            metrics.dbPool && metrics.dbPool.utilization < 80 ? 'text-green-600' : 'text-red-600'
          } mb-3`}>
            {metrics.dbPool?.utilization.toFixed(1)}%
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                metrics.dbPool && metrics.dbPool.utilization < 80 ? 'bg-green-500' : 'bg-red-500'
              }`}
              style={{ width: `${metrics.dbPool?.utilization || 0}%` }}
            ></div>
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-500">
            <span>Aktif: {metrics.dbPool?.active}</span>
            <span>Boşta: {metrics.dbPool?.idle}</span>
            <span>Beklemede: {metrics.dbPool?.waiting}</span>
          </div>
        </div>

        {/* Total Requests */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Toplam İstekler</h3>
          <div className="text-3xl font-bold text-indigo-600 mb-3">
            {metrics.totalRequests.toLocaleString('tr-TR')}
          </div>
          <p className="text-xs text-gray-500">
            Yavaş istekler: <span className="font-semibold text-orange-600">{metrics.slowRequests}</span>
          </p>
        </div>
      </div>

      {/* Slowest Endpoints */}
      {metrics.slowestEndpoints && metrics.slowestEndpoints.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">En Yavaş Uç Noktalar (Top 5)</h3>
          <div className="space-y-3">
            {metrics.slowestEndpoints.map((endpoint, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex-1">
                  <p className="font-mono text-sm text-gray-700">{endpoint.endpoint}</p>
                  <p className="text-xs text-gray-500">
                    {endpoint.count} istek • Ortalama: {endpoint.avgDuration}ms
                  </p>
                </div>
                <div className={`text-right ${getResponseTimeColor(endpoint.avgDuration)}`}>
                  <p className="font-semibold">{endpoint.avgDuration}ms</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {kpi && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">KPI İzlemesi</h3>
            {kpi.alertCount > 0 && (
              <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full flex items-center gap-2">
                <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                <span className="text-sm font-semibold">{kpi.alertCount} uyarı</span>
              </div>
            )}
          </div>

          {kpi.kpis && kpi.kpis.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kpi.kpis.slice(0, 6).map((k: any) => (
                <div
                  key={k.id}
                  className={`p-4 rounded border-l-4 ${
                    k.alert_triggered ? 'border-red-500 bg-red-50' : 'border-blue-500 bg-blue-50'
                  }`}
                >
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">{k.name}</h4>
                  <p className="text-xs text-gray-600 mb-2">{k.description}</p>
                  {k.target_value && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Hedef:</span>
                      <span className="font-bold text-gray-900">{k.target_value} {k.unit}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-sm">Henüz hiç KPI tanımlanmamış.</p>
          )}
        </div>
      )}
    </div>
  );
}
