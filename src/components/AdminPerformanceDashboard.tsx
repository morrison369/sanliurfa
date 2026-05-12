import { useState, useEffect } from 'react';
interface PerformanceStats {
 avg_lcp?: number;
 avg_ttfb?: number;
 avg_fcp?: number;
 lcp_fails?: number;
}

interface PerformancePage {
 url: string;
 samples: number;
 avg_lcp: number;
 lcp_violations: number;
}

interface ConnectionType {
 effective_type: string;
 count: number;
 avg_lcp: number;
}

interface DatabaseStatus {
 activeConnections: number;
 cacheHitRatio: string | number;
}

interface Recommendation {
 title: string;
 description: string;
 category: string;
 estimatedImpact: string;
}

interface PerformanceData {
 performance: {
 stats: PerformanceStats;
 pages: PerformancePage[];
 connectionTypes: ConnectionType[];
 database: DatabaseStatus;
 };
 recommendations: Recommendation[];
 lastUpdated: string;
}

export default function AdminPerformanceDashboard() {
 const [data, setData] = useState<PerformanceData | null>(null);
 const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
 const [loading, setLoading] = useState(true);
 const [activeTab, setActiveTab] = useState('summary');

 useEffect(() => {
 const fetchData = async () => {
 try {
 const [summaryRes, recsRes] = await Promise.all([
 fetch('/api/admin/performance/summary'),
 fetch('/api/admin/performance/recommendations')
 ]);

 if (summaryRes.ok) {
 const summaryData = await summaryRes.json();
 setData(summaryData.data);
 }

 if (recsRes.ok) {
 const recsData = await recsRes.json();
 setRecommendations(recsData.data.recommendations);
 }
 } catch (error) {
 console.error('Performans verisi alınamadı:', error);
 } finally {
 setLoading(false);
 }
 };

 fetchData();
 const interval = setInterval(fetchData, 60000);
 return () => clearInterval(interval);
 }, []);

 if (loading) {
 return <div className="text-center py-8">Performans verileri yükleniyor...</div>;
 }

 if (!data) {
 return <div className="text-center py-8 text-red-600">Performans verileri yüklenemedi</div>;
 }

 const stats = data.performance.stats || {};
 const avgLcp = stats.avg_lcp ? Math.round(stats.avg_lcp) : 0;
 const avgTtfb = stats.avg_ttfb ? Math.round(stats.avg_ttfb) : 0;
 const avgFcp = stats.avg_fcp ? Math.round(stats.avg_fcp) : 0;
 const lcpFails = stats.lcp_fails ?? 0;

 const getLcpStatus = (lcp: number) => {
 if (lcp <= 2500) return { color: 'text-green-600', bg: 'bg-[rgba(34,197,94,0.08)]', label: 'İyi' };
 if (lcp <= 4000) return { color: 'text-yellow-600', bg: 'bg-[rgba(234,179,8,0.08)]', label: 'İyileştirilmeli' };
 return { color: 'text-red-600', bg: 'bg-[rgba(239,68,68,0.1)]', label: 'Zayıf' };
 };

 const getTtfbStatus = (ttfb: number) => {
 if (ttfb <= 600) return { color: 'text-green-600', bg: 'bg-[rgba(34,197,94,0.08)]', label: 'İyi' };
 if (ttfb <= 1200) return { color: 'text-yellow-600', bg: 'bg-[rgba(234,179,8,0.08)]', label: 'Orta' };
 return { color: 'text-red-600', bg: 'bg-[rgba(239,68,68,0.1)]', label: 'Zayıf' };
 };

 const lcpStatus = getLcpStatus(avgLcp);
 const ttfbStatus = getTtfbStatus(avgTtfb);
 const tabLabels: Record<string, string> = {
 summary: 'Özet',
 pages: 'Sayfalar',
 connections: 'Bağlantılar',
 recommendations: 'Öneriler',
 };

 return (
 <div className="space-y-6">
 {/* Tabs */}
 <div className="flex gap-4 border-b border-[rgba(184,115,51,0.14)]">
 {['summary', 'pages', 'connections', 'recommendations'].map((tab) => (
 <button
 key={tab}
 onClick={() => setActiveTab(tab)}
 className={`px-4 py-2 border-b-2 transition-colors ${
 activeTab === tab
 ? 'border-urfa-500 text-[#7A6B58]'
 : 'border-transparent text-[#7A6B58] hover:text-[#1F1410]'
 }`}
 >
 {tabLabels[tab] || tab}
 </button>
 ))}
 </div>

 {/* Summary Tab */}
 {activeTab === 'summary' && (
 <div className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className={`p-6 rounded-sm ${lcpStatus.bg}`}>
 <h3 className="text-sm font-semibold mb-2">LCP (Largest Contentful Paint)</h3>
 <p className={`text-3xl font-bold ${lcpStatus.color}`}>{avgLcp}ms</p>
 <p className={`text-sm mt-2 ${lcpStatus.color}`}>{lcpStatus.label}</p>
 <p className="text-xs text-[#7A6B58] mt-2">Hedef: &lt;2500ms</p>
 </div>

 <div className={`p-6 rounded-sm ${ttfbStatus.bg}`}>
 <h3 className="text-sm font-semibold mb-2">TTFB (Time to First Byte)</h3>
 <p className={`text-3xl font-bold ${ttfbStatus.color}`}>{avgTtfb}ms</p>
 <p className={`text-sm mt-2 ${ttfbStatus.color}`}>{ttfbStatus.label}</p>
 <p className="text-xs text-[#7A6B58] mt-2">Hedef: &lt;600ms</p>
 </div>

 <div className="p-6 rounded-sm bg-[rgba(59,130,246,0.1)]">
 <h3 className="text-sm font-semibold mb-2">FCP (First Contentful Paint)</h3>
 <p className="text-3xl font-bold text-[#7A6B58]">{avgFcp}ms</p>
 <p className="text-sm mt-2 text-[#7A6B58]">İyi</p>
 <p className="text-xs text-[#7A6B58] mt-2">Hedef: &lt;1800ms</p>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="p-6 bg-[rgba(184,115,51,0.04)] rounded-sm">
 <h3 className="font-semibold mb-4">Veritabanı Durumu</h3>
 <div className="space-y-3 text-sm">
 <div className="flex justify-between">
 <span className="text-[#7A6B58]">Aktif Bağlantılar</span>
 <span className="font-semibold">{data.performance.database?.activeConnections || 0}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-[#7A6B58]">Önbellek İsabet Oranı</span>
 <span className="font-semibold">{data.performance.database?.cacheHitRatio || 'N/A'}</span>
 </div>
 </div>
 </div>

 <div className="p-6 bg-[rgba(184,115,51,0.04)] rounded-sm">
 <h3 className="font-semibold mb-4">İhlaller (24s)</h3>
 <div className="space-y-3 text-sm">
 <div className="flex justify-between">
 <span className="text-[#7A6B58]">LCP İhlalleri</span>
 <span className={`font-semibold ${lcpFails > 0 ? 'text-red-600' : 'text-green-600'}`}>
 {lcpFails}
 </span>
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Pages Tab */}
 {activeTab === 'pages' && (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-[rgba(184,115,51,0.04)]">
 <tr>
 <th className="px-4 py-3 text-left font-semibold">Sayfa</th>
 <th className="px-4 py-3 text-left font-semibold">Örnek</th>
 <th className="px-4 py-3 text-left font-semibold">Avg LCP</th>
 <th className="px-4 py-3 text-left font-semibold">İhlal</th>
 </tr>
 </thead>
 <tbody>
 {data.performance.pages.map((page, idx) => (
 <tr key={idx} className="border-t border-[rgba(184,115,51,0.14)]">
 <td className="px-4 py-3 truncate text-[#7A6B58]">{page.url}</td>
 <td className="px-4 py-3 font-semibold">{page.samples}</td>
 <td className={`px-4 py-3 font-semibold ${page.avg_lcp > 2500 ? 'text-red-600' : 'text-green-600'}`}>
 {Math.round(page.avg_lcp)}ms
 </td>
 <td className={`px-4 py-3 font-semibold ${page.lcp_violations > 0 ? 'text-red-600' : 'text-green-600'}`}>
 {page.lcp_violations}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}

 {activeTab === 'connections' && (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-[rgba(184,115,51,0.04)]">
 <tr>
 <th className="px-4 py-3 text-left font-semibold">Bağlantı Türü</th>
 <th className="px-4 py-3 text-left font-semibold">Oturum</th>
 <th className="px-4 py-3 text-left font-semibold">Ortalama LCP</th>
 </tr>
 </thead>
 <tbody>
 {(data.performance.connectionTypes || []).map((connection, idx) => (
 <tr key={idx} className="border-t border-[rgba(184,115,51,0.14)]">
 <td className="px-4 py-3 text-[#7A6B58]">{connection.effective_type || 'Bilinmiyor'}</td>
 <td className="px-4 py-3 font-semibold">{connection.count || 0}</td>
 <td className={`px-4 py-3 font-semibold ${connection.avg_lcp > 2500 ? 'text-red-600' : 'text-green-600'}`}>
 {Math.round(connection.avg_lcp || 0)}ms
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 {(data.performance.connectionTypes || []).length === 0 && (
 <p className="py-8 text-center text-[#7A6B58]">Bağlantı türü verisi yok</p>
 )}
 </div>
 )}

 {/* Recommendations Tab */}
 {activeTab === 'recommendations' && (
 <div className="space-y-4">
 {recommendations.map((rec, idx) => (
 <div key={idx} className="p-4 border rounded-sm bg-[rgba(184,115,51,0.04)]">
 <div className="flex items-start gap-3">
 <div className="flex-1">
 <h4 className="font-semibold">{rec.title}</h4>
 <p className="text-sm text-[#7A6B58] mt-1">{rec.description}</p>
 <div className="mt-3 space-y-2 text-xs">
 <p className="font-semibold">Kategori: {rec.category}</p>
 <p className="text-[#7A6B58]">Etki: {rec.estimatedImpact}</p>
 </div>
 </div>
 </div>
 </div>
 ))}
 {recommendations.length === 0 && (
 <p className="py-8 text-center text-[#7A6B58]">Performans önerisi yok</p>
 )}
 </div>
 )}

 <div className="text-xs text-[#7A6B58]">
 Son güncelleme: {new Date(data.lastUpdated).toLocaleString('tr-TR')}
 </div>
 </div>
 );
}
