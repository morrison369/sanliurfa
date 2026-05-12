/**
 * Business Analytics Dashboard Component
 * Comprehensive business analytics and insights for place owners
 */
import { useEffect, useState } from 'react';

interface Analytics {
 totalVisitors: number;
 avgRating: number;
 reviewCount: number;
 followerCount: number;
}

interface Metric {
 date: string;
 view_count: number;
 review_count: number;
 average_rating: number;
 new_followers: number;
}

interface Insight {
 id: string;
 title: string;
 description: string;
 priority: string;
 action_recommendation: string;
 estimated_impact: string;
}

export function BusinessAnalyticsDashboard() {
 const [placeId, setPlaceId] = useState<string>('');
 const [analytics, setAnalytics] = useState<Analytics | null>(null);
 const [metrics, setMetrics] = useState<Metric[]>([]);
 const [insights, setInsights] = useState<Insight[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [days, setDays] = useState(30);

 useEffect(() => {
 const params = new URLSearchParams(window.location.search);
 const id = params.get('placeId') || '';
 setPlaceId(id);

 if (id) {
 fetchData(id);
 }
 }, [days]);

 const fetchData = async (id: string) => {
 try {
 setLoading(true);
 setError(null);

 const [analyticsRes, insightsRes] = await Promise.all([
 fetch(`/api/business/analytics?placeId=${id}&days=${days}`),
 fetch(`/api/business/insights?placeId=${id}&limit=10`)
 ]);

 if (!analyticsRes.ok || !insightsRes.ok) {
 throw new Error('Analitik verileri alınamadı');
 }

 const analyticsData = await analyticsRes.json();
 const insightsData = await insightsRes.json();

 if (analyticsData.data?.analytics) {
 setAnalytics({
 totalVisitors: analyticsData.data.analytics.totalVisitors || 0,
 avgRating: analyticsData.data.analytics.avgRating || 0,
 reviewCount: analyticsData.data.analytics.reviewCount || 0,
 followerCount: analyticsData.data.analytics.followerCount || 0
 });
 }

 setMetrics(analyticsData.data?.metrics || []);
 setInsights(insightsData.data || []);
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Analitik verileri yüklenemedi');
 } finally {
 setLoading(false);
 }
 };

 const handleAcknowledgeInsight = async (insightId: string) => {
 try {
 const res = await fetch('/api/business/insights', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 placeId,
 insightId,
 action: 'acknowledge'
 })
 });

 if (res.ok) {
 setInsights(insights.filter((i) => i.id !== insightId));
 }
 } catch (err) {
 console.error('İçgörü onaylanamadı', err);
 }
 };

 if (!placeId) {
 return <div className="p-4 text-center text-[#7A6B58]">Mekan seçilmedi</div>;
 }

 if (loading) {
 return (
 <div className="space-y-4">
 {[...Array(6)].map((_, i) => (
 <div key={i} className="bg-[rgba(184,115,51,0.08)] rounded-sm h-20 animate-pulse"></div>
 ))}
 </div>
 );
 }

 if (error) {
 return <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] rounded-sm p-4 text-red-300">{error}</div>;
 }

 const totalMetrics = metrics.reduce((acc, m) => ({
 views: (acc.views || 0) + (m.view_count || 0),
 reviews: (acc.reviews || 0) + (m.review_count || 0),
 followers: (acc.followers || 0) + (m.new_followers || 0)
 }), { views: 0, reviews: 0, followers: 0 });
 const chartMax = Math.max(
 1,
 ...metrics.flatMap((m) => [
 Number(m.view_count || 0),
 Number(m.review_count || 0) * 20,
 Number(m.new_followers || 0) * 20,
 ]),
 );
 const chartPoints = metrics.map((m, index) => {
 const x = metrics.length <= 1 ? 0 : (index / (metrics.length - 1)) * 100;
 const y = 38 - (Number(m.view_count || 0) / chartMax) * 36;
 return `${x.toFixed(2)},${y.toFixed(2)}`;
 }).join(' ');
 const recentMetrics = metrics.slice(-7);

 return (
 <div className="space-y-6">
 {/* Period Selector */}
 <div className="flex gap-2">
 {[7, 30, 90].map((d) => (
 <button
 key={d}
 onClick={() => setDays(d)}
 className={`px-4 py-2 rounded-sm font-medium transition ${
 days === d
 ? 'bg-urfa-600 text-white'
 : 'bg-[rgba(184,115,51,0.1)] text-[#7A6B58] hover:bg-[rgba(184,115,51,0.18)]'
 }`}
 >
 {d} Gün
 </button>
 ))}
 </div>

 {/* Overview Cards */}
 {analytics && (
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="bg-[rgba(59,130,246,0.1)] rounded-sm p-6 border border-[rgba(59,130,246,0.2)]">
 <p className="text-[#7A6B58] text-sm">Toplam Ziyaretçi</p>
 <p className="text-3xl font-bold text-[#B87333] mt-2">{analytics.totalVisitors.toLocaleString()}</p>
 </div>
 <div className="bg-[rgba(34,197,94,0.08)] rounded-sm p-6 border border-[rgba(34,197,94,0.2)]">
 <p className="text-[#7A6B58] text-sm">Ortalama Puan</p>
 <p className="text-3xl font-bold text-green-600 mt-2">{analytics.avgRating.toFixed(1)}</p>
 </div>
 <div className="bg-[rgba(168,85,247,0.06)] rounded-sm p-6 border border-[rgba(168,85,247,0.2)]">
 <p className="text-[#7A6B58] text-sm">İnceleme Sayısı</p>
 <p className="text-3xl font-bold text-[#B87333] mt-2">{analytics.reviewCount}</p>
 </div>
 <div className="bg-[rgba(184,115,51,0.06)] rounded-sm p-6 border border-[rgba(184,115,51,0.15)]">
 <p className="text-[#7A6B58] text-sm">Takipçi</p>
 <p className="text-3xl font-bold text-orange-600 mt-2">{analytics.followerCount}</p>
 </div>
 </div>
 )}

 {/* Period Metrics */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-6">
 <p className="text-[#7A6B58] text-sm">Bu Dönemde Görüntülenme</p>
 <p className="text-2xl font-bold mt-2">{totalMetrics.views}</p>
 </div>
 <div className="bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-6">
 <p className="text-[#7A6B58] text-sm">Bu Dönemde İnceleme</p>
 <p className="text-2xl font-bold mt-2">{totalMetrics.reviews}</p>
 </div>
 <div className="bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-6">
 <p className="text-[#7A6B58] text-sm">Yeni Takipçiler</p>
 <p className="text-2xl font-bold mt-2">{totalMetrics.followers}</p>
 </div>
 </div>

 {/* Insights */}
 {insights.length > 0 && (
 <div className="space-y-3">
 <h3 className="text-lg font-semibold">🔍 AI Önerileri</h3>
 {insights.map((insight) => (
 <div
 key={insight.id}
 className={`border-l-4 p-4 rounded ${
 insight.priority === 'high'
 ? 'border-red-500 bg-[rgba(239,68,68,0.1)]'
 : insight.priority === 'medium'
 ? 'border-[rgba(234,179,8,0.5)] bg-[rgba(234,179,8,0.08)]'
 : 'border-blue-500 bg-[rgba(59,130,246,0.1)]'
 }`}
 >
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <h4 className="font-semibold">{insight.title}</h4>
 <p className="text-sm text-[#4A3828] mt-1">{insight.description}</p>
 <p className="text-xs text-[#7A6B58] mt-2">💡 {insight.action_recommendation}</p>
 <p className="text-xs text-[#7A6B58] mt-1">📈 Beklenen Etki: {insight.estimated_impact}</p>
 </div>
 <button
 onClick={() => handleAcknowledgeInsight(insight.id)}
 className="ml-4 px-3 py-1 text-xs bg-[var(--bg-card)] rounded border border-[rgba(184,115,51,0.25)] hover:bg-[rgba(184,115,51,0.06)]"
 >
 Anladım
 </button>
 </div>
 </div>
 ))}
 </div>
 )}

 {/* Daily Metrics Chart */}
 {metrics.length > 0 && (
 <div className="bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-6">
 <h3 className="text-lg font-semibold mb-4">Günlük Trendler</h3>
 <div className="rounded-sm border border-[rgba(184,115,51,0.1)] bg-[rgba(184,115,51,0.04)] p-4">
 <svg viewBox="0 0 100 42" role="img" aria-label="Günlük görüntülenme trendi" className="h-48 w-full overflow-visible">
 <line x1="0" y1="40" x2="100" y2="40" stroke="#d1d5db" strokeWidth="0.5" />
 <polyline
 fill="none"
 stroke="#2563eb"
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth="1.8"
 points={chartPoints}
 />
 {metrics.map((m, index) => {
 const x = metrics.length <= 1 ? 0 : (index / (metrics.length - 1)) * 100;
 const y = 38 - (Number(m.view_count || 0) / chartMax) * 36;
 return (
 <circle
 key={`${m.date}-${index}`}
 cx={x}
 cy={y}
 r="1.4"
 fill="#2563eb"
 >
 <title>{`${new Date(m.date).toLocaleDateString('tr-TR')}: ${m.view_count || 0} görüntülenme`}</title>
 </circle>
 );
 })}
 </svg>
 <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-[#7A6B58] md:grid-cols-7">
 {recentMetrics.map((m) => (
 <div key={m.date} className="rounded border border-[rgba(184,115,51,0.14)] bg-[var(--bg-card)] px-2 py-2">
 <div className="font-semibold text-[#1F1410]">{new Date(m.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}</div>
 <div>{m.view_count || 0} görüntülenme</div>
 <div>{m.review_count || 0} yorum</div>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
