import { useState, useEffect } from 'react';
interface WebhookMetrics {
 totalWebhooks: number;
 totalEvents: number;
 deliveredEvents: number;
 failedEvents: number;
 pendingEvents: number;
 successRate: number;
 avgDeliveryTime: number;
 byEvent: Record<string, any>;
 lastHourActivity: { time: string; sent: number; delivered: number; failed: number }[];
 topFailedEvents: { event: string; failedCount: number; attempts: number }[];
}

interface DashboardProps {
 token: string;
}

export default function WebhookAnalyticsDashboard({ token }: DashboardProps) {
 const [metrics, setMetrics] = useState<WebhookMetrics | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'failed'>('overview');

 useEffect(() => {
 loadMetrics();
 const interval = setInterval(loadMetrics, 30000); // Her 30 saniyede yenile.
 return () => clearInterval(interval);
 }, []);

 const loadMetrics = async () => {
 try {
 const res = await fetch('/api/webhooks/analytics', {
 headers: {
 'Authorization': `Bearer ${token}`
 }
 });

 if (!res.ok) throw new Error('Webhook metrikleri yüklenemedi.');
 const data = await res.json();
 setMetrics(data.data);
 setError(null);
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Bilinmeyen hata oluştu.');
 } finally {
 setLoading(false);
 }
 };

 if (loading) {
 return <div className="text-center py-8 text-[#7A6B58]">Yükleniyor…</div>;
 }

 if (error || !metrics) {
 return (
 <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] rounded-sm p-4">
 <p className="text-red-700">{error || 'Webhook metrikleri yüklenemedi.'}</p>
 </div>
 );
 }

 const getStatusColor = (rate: number) => {
 if (rate >= 95) return 'text-green-600';
 if (rate >= 80) return 'text-yellow-600';
 return 'text-red-600';
 };

 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <h2 className="text-2xl font-bold text-[#1F1410]">Webhook Analitikleri</h2>
 <button
 onClick={loadMetrics}
 className="px-4 py-2 bg-urfa-600 text-white rounded-sm hover:bg-urfa-700 transition text-sm"
 >
 Yenile
 </button>
 </div>

 {/* Genel istatistikler */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
 <div className="bg-[var(--bg-card)] rounded-sm shadow-md p-4">
 <p className="text-[#7A6B58] text-sm">Toplam Webhook</p>
 <p className="text-3xl font-bold text-[#1F1410]">{metrics.totalWebhooks}</p>
 </div>

 <div className="bg-[var(--bg-card)] rounded-sm shadow-md p-4">
 <p className="text-[#7A6B58] text-sm">Toplam Olaylar</p>
 <p className="text-3xl font-bold text-[#1F1410]">{metrics.totalEvents}</p>
 </div>

 <div className="bg-[var(--bg-card)] rounded-sm shadow-md p-4">
 <p className="text-[#7A6B58] text-sm">Başarılı</p>
 <p className="text-3xl font-bold text-green-600">{metrics.deliveredEvents}</p>
 </div>

 <div className="bg-[var(--bg-card)] rounded-sm shadow-md p-4">
 <p className="text-[#7A6B58] text-sm">Başarısız</p>
 <p className="text-3xl font-bold text-red-600">{metrics.failedEvents}</p>
 </div>

 <div className="bg-[var(--bg-card)] rounded-sm shadow-md p-4">
 <p className="text-[#7A6B58] text-sm">Başarı Oranı</p>
 <p className={`text-3xl font-bold ${getStatusColor(metrics.successRate)}`}>
 {metrics.successRate.toFixed(1)}%
 </p>
 </div>
 </div>

 {/* Sekmeler */}
 <div className="bg-[var(--bg-card)] rounded-sm shadow-md">
 <div className="flex border-b">
 {(['overview', 'events', 'failed'] as const).map(tab => (
 <button
 key={tab}
 onClick={() => setActiveTab(tab)}
 className={`flex-1 px-4 py-3 text-center font-medium transition ${
 activeTab === tab
 ? 'text-[#1F1410] border-b-2 border-urfa-500'
 : 'text-[#7A6B58] hover:text-[#B87333]'
 }`}
 >
 {tab === 'overview' && 'Genel Bakış'}
 {tab === 'events' && 'Olaylar'}
 {tab === 'failed' && 'Başarısız'}
 </button>
 ))}
 </div>

 <div className="p-6">
 {activeTab === 'overview' && (
 <div className="space-y-6">
 <div>
 <h3 className="font-semibold text-[#1F1410] mb-4">Son Saat Aktivitesi</h3>
 <div className="space-y-2 max-h-96 overflow-y-auto">
 {metrics.lastHourActivity.slice(0, 20).map((activity, idx) => (
 <div key={idx} className="flex items-center justify-between text-sm p-2 bg-[rgba(184,115,51,0.04)] rounded">
 <span className="text-[#7A6B58]">
 {new Date(activity.time).toLocaleTimeString('tr-TR')}
 </span>
 <div className="flex gap-4">
 <span className="text-[#7A6B58]">Gönderilen: {activity.sent}</span>
 <span className="text-green-600">Teslim: {activity.delivered}</span>
 <span className="text-red-600">Hata: {activity.failed}</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {activeTab === 'events' && (
 <div className="space-y-4">
 <h3 className="font-semibold text-[#1F1410] mb-4">Olay Türleri Başarı Oranları</h3>
 {Object.entries(metrics.byEvent).map(([event, stats]: [string, { success: number; failed: number; rate?: number; successRate?: number; total?: number; delivered?: number; pending?: number }]) => (
 <div key={event} className="p-4 bg-[rgba(184,115,51,0.04)] rounded-sm">
 {(() => {
 const successRate = stats.successRate ?? stats.rate ?? 0;
 return (
 <>
 <div className="flex justify-between items-start mb-2">
 <h4 className="font-medium text-[#1F1410]">{event}</h4>
 <span className={`text-sm font-semibold ${getStatusColor(successRate)}`}>
 {successRate}%
 </span>
 </div>
 <div className="w-full bg-[rgba(184,115,51,0.08)] rounded-full h-2 mb-2">
 <div
 className="bg-[#B87333] h-2 rounded-full"
 style={{ width: `${Math.min(successRate, 100)}%` }}
 />
 </div>
 <div className="grid grid-cols-4 gap-2 text-xs text-[#7A6B58]">
 <div>Toplam: {stats.total}</div>
 <div>Başarılı: {stats.delivered}</div>
 <div>Başarısız: {stats.failed}</div>
 <div>Bekleme: {stats.pending}</div>
 </div>
 </>
 );
 })()}
 </div>
 ))}
 </div>
 )}

 {activeTab === 'failed' && (
 <div className="space-y-4">
 <h3 className="font-semibold text-[#1F1410] mb-4">En Çok Başarısız Olaylar</h3>
 {metrics.topFailedEvents.length === 0 ? (
 <p className="text-[#7A6B58] text-center py-8">Başarısız olay yok 🎉</p>
 ) : (
 metrics.topFailedEvents.map((item, idx) => (
 <div key={idx} className="p-4 bg-[rgba(239,68,68,0.1)] rounded-sm border border-[rgba(239,68,68,0.25)]">
 <div className="flex justify-between items-start">
 <div>
 <h4 className="font-medium text-[#1F1410]">{item.event}</h4>
 <p className="text-sm text-[#7A6B58] mt-1">
 {item.failedCount} başarısız, {item.attempts} toplam deneme
 </p>
 </div>
 <button className="px-3 py-1 bg-urfa-600 text-white rounded text-sm hover:bg-urfa-700">
 Yeniden Dene
 </button>
 </div>
 </div>
 ))
 )}
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
