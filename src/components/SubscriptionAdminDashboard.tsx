/**
 * Subscription Admin Dashboard Component
 * Dashboard for managing subscriptions and viewing analytics
 */
import { useState, useEffect } from 'react';
interface Analytics {
 subscriptions: {
 totalSubscriptions: number;
 activeSubscriptions: number;
 cancelledSubscriptions: number;
 byTier: Record<string, number>;
 mrr: number;
 arr: number;
 churnRate: number;
 };
 webhooks: {
 pending: number;
 failed: number;
 successful: number;
 retrying: number;
 };
}

interface SubscriptionAdminDashboardProps {}

export default function SubscriptionAdminDashboard({}: SubscriptionAdminDashboardProps) {
 const [analytics, setAnalytics] = useState<Analytics | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'webhooks'>('overview');

 useEffect(() => {
 const fetchAnalytics = async () => {
 try {
 setLoading(true);
 const response = await fetch('/api/admin/subscriptions/analytics');

 if (!response.ok) {
 throw new Error('Abonelik analitiği yüklenemedi.');
 }

 const data = await response.json();
 setAnalytics(data.subscriptions || null);
 setError(null);
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Abonelik analitiği yüklenemedi.');
 } finally {
 setLoading(false);
 }
 };

 fetchAnalytics();
 }, []);

 if (loading) {
 return (
 <div className="space-y-6">
 {[1, 2, 3, 4].map((i) => (
 <div key={i} className="h-32 bg-[var(--adm-bg-hover)] rounded-sm animate-pulse" />
 ))}
 </div>
 );
 }

 if (error) {
 return (
 <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] rounded-sm p-6">
 <p className="text-red-700 ">{error}</p>
 </div>
 );
 }

 if (!analytics) {
 return (
 <div className="bg-[var(--adm-bg-hover)] border border-[var(--adm-border)] rounded-sm p-6 text-center">
 <p className="text-[var(--adm-text-muted)]">Veri yüklenemedi</p>
 </div>
 );
 }

 const mrrDisplay = analytics.subscriptions.mrr.toFixed(2);
 const arrDisplay = analytics.subscriptions.arr.toFixed(2);
 const churnPercentage = analytics.subscriptions.churnRate.toFixed(1);

 return (
 <div className="space-y-6">
 {/* Sekmeler */}
 <div className="flex gap-2 border-b border-[var(--adm-border)]">
 <button
 onClick={() => setActiveTab('overview')}
 className={`px-4 py-2 font-medium border-b-2 transition ${
 activeTab === 'overview'
 ? 'border-urfa-500 text-[var(--adm-text-muted)]'
 : 'border-transparent text-[var(--adm-text-muted)] hover:text-[var(--adm-text)]'
 }`}
 >
 Özet
 </button>
 <button
 onClick={() => setActiveTab('users')}
 className={`px-4 py-2 font-medium border-b-2 transition ${
 activeTab === 'users'
 ? 'border-urfa-500 text-[var(--adm-text-muted)]'
 : 'border-transparent text-[var(--adm-text-muted)] hover:text-[var(--adm-text)]'
 }`}
 >
 Kullanıcılar
 </button>
 <button
 onClick={() => setActiveTab('webhooks')}
 className={`px-4 py-2 font-medium border-b-2 transition ${
 activeTab === 'webhooks'
 ? 'border-urfa-500 text-[var(--adm-text-muted)]'
 : 'border-transparent text-[var(--adm-text-muted)] hover:text-[var(--adm-text)]'
 }`}
 >
 Webhook'lar
 </button>
 </div>

 {activeTab === 'overview' && (
 <div className="space-y-6">
 {/* Ana metrikler */}
 <div className="grid md:grid-cols-4 gap-4">
 <div className="bg-[var(--adm-bg-elev)] rounded-sm p-6 border border-[var(--adm-border)]">
 <h3 className="text-sm font-medium text-[var(--adm-text-muted)] mb-2">Toplam Abonelik</h3>
 <p className="text-3xl font-bold text-[var(--adm-text)]">
 {analytics.subscriptions.totalSubscriptions}
 </p>
 </div>

 <div className="bg-[var(--adm-bg-elev)] rounded-sm p-6 border border-[var(--adm-border)]">
 <h3 className="text-sm font-medium text-[var(--adm-text-muted)] mb-2">Aktif</h3>
 <p className="text-3xl font-bold text-green-600 ">
 {analytics.subscriptions.activeSubscriptions}
 </p>
 </div>

 <div className="bg-[var(--adm-bg-elev)] rounded-sm p-6 border border-[var(--adm-border)]">
 <h3 className="text-sm font-medium text-[var(--adm-text-muted)] mb-2">Aylık Gelir (MRR)</h3>
 <p className="text-3xl font-bold text-[var(--adm-text-muted)] ">₺{mrrDisplay}</p>
 </div>

 <div className="bg-[var(--adm-bg-elev)] rounded-sm p-6 border border-[var(--adm-border)]">
 <h3 className="text-sm font-medium text-[var(--adm-text-muted)] mb-2">Churn Oranı</h3>
 <p className="text-3xl font-bold text-red-600 ">{churnPercentage}%</p>
 </div>
 </div>

 {/* Plan dağılımı */}
 <div className="bg-[var(--adm-bg-elev)] rounded-sm p-6 border border-[var(--adm-border)]">
 <h3 className="text-lg font-semibold text-[var(--adm-text)] mb-4">Plan Dağılımı</h3>
 <div className="space-y-3">
 {Object.entries(analytics.subscriptions.byTier).map(([tier, count]) => (
 <div key={tier} className="flex items-center justify-between">
 <span className="text-[var(--adm-text-muted)]">{tier}</span>
 <div className="flex items-center gap-2">
 <div className="w-32 h-2 bg-[var(--adm-bg-hover)] rounded-full overflow-hidden">
 <div
 className="h-full bg-[#B87333]"
 style={{
 width: `${(count / analytics.subscriptions.activeSubscriptions) * 100}%`,
 }}
 />
 </div>
 <span className="font-semibold text-[var(--adm-text)] w-12 text-right">{count}</span>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Gelir özeti */}
 <div className="bg-[var(--adm-bg-hover)] rounded-sm p-6 border border-[var(--adm-border)] ">
 <h3 className="text-lg font-semibold text-[var(--adm-text)] mb-4">Gelir Özeti</h3>
 <div className="grid md:grid-cols-2 gap-6">
 <div>
 <p className="text-sm text-[var(--adm-text-muted)] mb-1">Aylık Gelir (MRR)</p>
 <p className="text-2xl font-bold text-green-600 ">₺{mrrDisplay}</p>
 </div>
 <div>
 <p className="text-sm text-[var(--adm-text-muted)] mb-1">Yıllık Değerleme (ARR)</p>
 <p className="text-2xl font-bold text-[var(--adm-text-muted)] ">₺{arrDisplay}</p>
 </div>
 </div>
 </div>
 </div>
 )}

 {activeTab === 'users' && (
 <div className="bg-[var(--adm-bg-elev)] rounded-sm p-6 border border-[var(--adm-border)]">
 <h3 className="text-lg font-semibold text-[var(--adm-text)] mb-4">Kullanıcı Yönetimi</h3>
 <p className="text-[var(--adm-text-muted)] mb-4">
 Kullanıcıların abonelik durumunu ve planlarını yönetin. Aşağıdaki linke tıklayarak detaylı yönetim sayfasına gidin.
 </p>
 <a
 href="/admin/subscriptions/users"
 className="inline-block px-6 py-2 bg-urfa-600 hover:bg-urfa-700 text-white rounded-sm font-medium transition"
 >
 Kullanıcı Yönetim Paneli →
 </a>
 </div>
 )}

 {activeTab === 'webhooks' && (
 <div className="space-y-4">
 <div className="grid md:grid-cols-4 gap-4">
 <div className="bg-[var(--adm-bg-elev)] rounded-sm p-6 border border-[var(--adm-border)]">
 <h3 className="text-sm font-medium text-[var(--adm-text-muted)] mb-2">Başarılı</h3>
 <p className="text-3xl font-bold text-green-600">
 {analytics.webhooks?.successful || 0}
 </p>
 </div>

 <div className="bg-[var(--adm-bg-elev)] rounded-sm p-6 border border-[var(--adm-border)]">
 <h3 className="text-sm font-medium text-[var(--adm-text-muted)] mb-2">Beklemede</h3>
 <p className="text-3xl font-bold text-yellow-600">
 {analytics.webhooks?.pending || 0}
 </p>
 </div>

 <div className="bg-[var(--adm-bg-elev)] rounded-sm p-6 border border-[var(--adm-border)]">
 <h3 className="text-sm font-medium text-[var(--adm-text-muted)] mb-2">Yeniden Deniyor</h3>
 <p className="text-3xl font-bold text-[var(--adm-text-muted)]">
 {analytics.webhooks?.retrying || 0}
 </p>
 </div>

 <div className="bg-[var(--adm-bg-elev)] rounded-sm p-6 border border-[var(--adm-border)]">
 <h3 className="text-sm font-medium text-[var(--adm-text-muted)] mb-2">Başarısız</h3>
 <p className="text-3xl font-bold text-red-600">
 {analytics.webhooks?.failed || 0}
 </p>
 </div>
 </div>

 <div className="bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)] rounded-sm p-4">
 <p className="text-sm text-blue-300 ">
 Webhook teslimat durumunu izleyin. Başarısız webhook'lar işleniyor ve otomatik olarak yeniden deneniyor.
 </p>
 </div>
 </div>
 )}
 </div>
 );
}
