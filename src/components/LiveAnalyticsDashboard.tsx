import { useState, useEffect } from 'react';
import { realtimeManager } from '../lib/realtime/realtime-sse';

interface MetricsData {
 errorRate: number;
 avgDuration: number;
 p95Duration: number;
 cacheHitRate: number;
 slowRequests: number;
 totalRequests: number;
 slowestEndpoints?: { endpoint: string; count: number; avgDuration: number }[];
 dbPool?: {
 active: number;
 idle: number;
 waiting: number;
 utilization: number;
 };
}

interface KPIData {
 kpis: { id: string; name: string; description?: string; target_value?: number; unit?: string; alert_triggered?: boolean }[];
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
 if (percent < threshold * 0.5) return 'bg-[rgba(34,197,94,0.08)]0';
 if (percent < threshold) return 'bg-[rgba(234,179,8,0.08)]0';
 return 'bg-[rgba(239,68,68,0.1)]0';
 };

 if (!metrics) {
 return (
 <div className="space-y-6 animate-pulse">
  <div className="flex items-center gap-2 h-8 w-48 bg-[rgba(184,115,51,0.12)] rounded-sm" />
  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
   {[1,2,3,4,5,6].map(i => <div key={i} className="h-28 bg-[rgba(184,115,51,0.08)] rounded-sm" />)}
  </div>
  <div className="h-40 bg-[rgba(184,115,51,0.06)] rounded-sm" />
 </div>
 );
 }

 return (
 <div className="space-y-8">
 {/* Header with connection status */}
 <div className="flex items-center justify-between">
 <h2 className="text-3xl font-bold text-[#1F1410]">Canlı Analitik Gösterge Paneli</h2>
 <div className="flex items-center gap-2">
 <div className={`w-3 h-3 rounded-full ${connected ? 'bg-[rgba(34,197,94,0.08)]0 animate-pulse' : 'bg-[rgba(239,68,68,0.1)]0'}`}></div>
 <span className="text-sm text-[#7A6B58]">
 {connected ? 'Canlı' : 'Bağlantısız'}
 {lastUpdate && ` • Son güncelleme: ${lastUpdate}`}
 </span>
 </div>
 </div>

 {/* Metrics Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {/* Error Rate */}
 <div className="bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-6">
 <h3 className="text-sm font-medium text-[#7A6B58] mb-2">Hata Oranı</h3>
 <div className={`text-3xl font-bold ${getErrorRateColor(metrics.errorRate)} mb-3`}>
 {metrics.errorRate.toFixed(2)}%
 </div>
 <div className="w-full bg-[rgba(184,115,51,0.08)] rounded-full h-2">
 <div
 className={`h-2 rounded-full transition-all ${getProgressColor(metrics.errorRate, 5)}`}
 style={{ width: `${Math.min(metrics.errorRate * 20, 100)}%` }}
 ></div>
 </div>
 <p className="text-xs text-[#7A6B58] mt-2">
 {metrics.errorRate < 2 ? '✓ İyi' : metrics.errorRate < 5 ? '⚠ Dikkat' : '✗ Kritik'}
 </p>
 </div>

 {/* Average Response Time */}
 <div className="bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-6">
 <h3 className="text-sm font-medium text-[#7A6B58] mb-2">Ortalama Yanıt Süresi</h3>
 <div className={`text-3xl font-bold ${getResponseTimeColor(metrics.avgDuration)} mb-3`}>
 {metrics.avgDuration}ms
 </div>
 <div className="w-full bg-[rgba(184,115,51,0.08)] rounded-full h-2">
 <div
 className={`h-2 rounded-full transition-all ${getProgressColor(metrics.avgDuration, 500)}`}
 style={{ width: `${Math.min((metrics.avgDuration / 500) * 100, 100)}%` }}
 ></div>
 </div>
 <p className="text-xs text-[#7A6B58] mt-2">
 {metrics.avgDuration < 200 ? '✓ İyi' : metrics.avgDuration < 500 ? '⚠ Normal' : '✗ Yavaş'}
 </p>
 </div>

 {/* P95 Response Time */}
 <div className="bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-6">
 <h3 className="text-sm font-medium text-[#7A6B58] mb-2">P95 Yanıt Süresi</h3>
 <div className="text-3xl font-bold text-[#7A6B58] mb-3">
 {metrics.p95Duration}ms
 </div>
 <div className="w-full bg-[rgba(184,115,51,0.08)] rounded-full h-2">
 <div
 className="h-2 rounded-full bg-urfa-600 transition-all"
 style={{ width: `${Math.min((metrics.p95Duration / 1000) * 100, 100)}%` }}
 ></div>
 </div>
 <p className="text-xs text-[#7A6B58] mt-2">95. yüzdelik gecikme</p>
 </div>

 {/* Cache Hit Rate */}
 <div className="bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-6">
 <h3 className="text-sm font-medium text-[#7A6B58] mb-2">Önbellek İsabet Oranı</h3>
 <div className="text-3xl font-bold text-green-600 mb-3">
 {metrics.cacheHitRate.toFixed(1)}%
 </div>
 <div className="w-full bg-[rgba(184,115,51,0.08)] rounded-full h-2">
 <div
 className="h-2 rounded-full bg-[rgba(34,197,94,0.08)]0 transition-all"
 style={{ width: `${metrics.cacheHitRate}%` }}
 ></div>
 </div>
 <p className="text-xs text-[#7A6B58] mt-2">
 {metrics.cacheHitRate > 70 ? '✓ Mükemmel' : '⚠ İyileştir'}
 </p>
 </div>

 {/* DB Pool Utilization */}
 <div className="bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-6">
 <h3 className="text-sm font-medium text-[#7A6B58] mb-2">DB Havuzu Kullanımı</h3>
 <div className={`text-3xl font-bold ${
 metrics.dbPool && metrics.dbPool.utilization < 80 ? 'text-green-600' : 'text-red-600'
 } mb-3`}>
 {metrics.dbPool?.utilization.toFixed(1)}%
 </div>
 <div className="w-full bg-[rgba(184,115,51,0.08)] rounded-full h-2">
 <div
 className={`h-2 rounded-full transition-all ${
 metrics.dbPool && metrics.dbPool.utilization < 80 ? 'bg-[rgba(34,197,94,0.08)]0' : 'bg-[rgba(239,68,68,0.1)]0'
 }`}
 style={{ width: `${metrics.dbPool?.utilization || 0}%` }}
 ></div>
 </div>
 <div className="mt-2 flex justify-between text-xs text-[#7A6B58]">
 <span>Aktif: {metrics.dbPool?.active}</span>
 <span>Boşta: {metrics.dbPool?.idle}</span>
 <span>Beklemede: {metrics.dbPool?.waiting}</span>
 </div>
 </div>

 {/* Total Requests */}
 <div className="bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-6">
 <h3 className="text-sm font-medium text-[#7A6B58] mb-2">Toplam İstekler</h3>
 <div className="text-3xl font-bold text-[#9C7A5A] mb-3">
 {metrics.totalRequests.toLocaleString('tr-TR')}
 </div>
 <p className="text-xs text-[#7A6B58]">
 Yavaş istekler: <span className="font-semibold text-orange-600">{metrics.slowRequests}</span>
 </p>
 </div>
 </div>

 {/* Slowest Endpoints */}
 {metrics.slowestEndpoints && metrics.slowestEndpoints.length > 0 && (
 <div className="bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-6">
 <h3 className="text-lg font-semibold text-[#1F1410] mb-4">En Yavaş Uç Noktalar (Top 5)</h3>
 <div className="space-y-3">
 {metrics.slowestEndpoints.map((endpoint, idx) => (
 <div key={idx} className="flex items-center justify-between p-3 bg-[rgba(184,115,51,0.04)] rounded">
 <div className="flex-1">
 <p className="font-mono text-sm text-[#7A6B58]">{endpoint.endpoint}</p>
 <p className="text-xs text-[#7A6B58]">
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
 <div className="bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-6">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-semibold text-[#1F1410]">KPI İzlemesi</h3>
 {kpi.alertCount > 0 && (
 <div className="bg-[rgba(239,68,68,0.1)] text-red-300 px-3 py-1 rounded-full flex items-center gap-2">
 <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
 <span className="text-sm font-semibold">{kpi.alertCount} uyarı</span>
 </div>
 )}
 </div>

 {kpi.kpis && kpi.kpis.length > 0 ? (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {kpi.kpis.slice(0, 6).map((k) => (
 <div
 key={k.id}
 className={`p-4 rounded border-l-4 ${
 k.alert_triggered ? 'border-red-500 bg-[rgba(239,68,68,0.1)]' : 'border-blue-500 bg-[rgba(59,130,246,0.1)]'
 }`}
 >
 <h4 className="font-semibold text-[#1F1410] text-sm mb-1">{k.name}</h4>
 <p className="text-xs text-[#7A6B58] mb-2">{k.description}</p>
 {k.target_value && (
 <div className="flex justify-between items-center">
 <span className="text-xs text-[#7A6B58]">Hedef:</span>
 <span className="font-bold text-[#1F1410]">{k.target_value} {k.unit}</span>
 </div>
 )}
 </div>
 ))}
 </div>
 ) : (
 <p className="text-[#7A6B58] text-sm">Henüz hiç KPI tanımlanmamış.</p>
 )}
 </div>
 )}
 </div>
 );
}
