/**
 * Admin Dashboard Overview Component
 * Main dashboard with metrics and alerts
 */
import { useState, useEffect } from 'react';
import { AlertCircle, Users, FileText, Flag, ShieldAlert } from 'lucide-react';

interface DashboardData {
 overview: {
 users: { total: number; new: number; active: number };
 content: { places: number; reviews: number; comments: number; newReviews: number };
 flags: { pending: number; resolved: number; total: number };
 moderation: { totalActions: number; warnings: number; suspensions: number; bans: number };
 period: number;
 };
 metrics: Record<string, unknown>;
 moderation: {
 queue: { pending: number; inReview: number };
 flags: { highSeverity: number };
 actions: { suspensions: number };
 } | null;
}

export default function AdminDashboardOverview() {
 const [data, setData] = useState<DashboardData | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [period, setPeriod] = useState(30);

 useEffect(() => {
 const fetchData = async () => {
 try {
 setLoading(true);
 const res = await fetch(`/api/admin/dashboard/overview?days=${period}`);
 const json = await res.json();

 if (!json.success) {
 setError(json.error || 'Veri alınırken bir hata oluştu');
 return;
 }

 setData(json.data);
 setError(null);
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu');
 } finally {
 setLoading(false);
 }
 };

 fetchData();
 }, [period]);

 if (loading) {
 return (
 <div className="flex items-center justify-center p-8">
 <div className="text-[#7A6B58]">Yükleniyor...</div>
 </div>
 );
 }

 if (error) {
 return (
 <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] rounded-sm p-4 flex items-start gap-3">
 <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
 <div>
 <h3 className="font-medium text-red-400">Hata</h3>
 <p className="text-red-700 text-sm">{error}</p>
 </div>
 </div>
 );
 }

 if (!data) return null;

 return (
 <div className="space-y-6">
 {/* Period Selector */}
 <div className="flex gap-2">
 {[7, 30, 90, 365].map((days) => (
 <button
 key={days}
 onClick={() => setPeriod(days)}
 className={`px-4 py-2 rounded-sm font-medium text-sm transition-colors ${
 period === days
 ? 'bg-urfa-600 text-white'
 : 'bg-[rgba(184,115,51,0.1)] text-[#7A6B58] hover:bg-[rgba(184,115,51,0.18)]'
 }`}
 >
 {days === 7 ? '7 gün' : days === 30 ? '30 gün' : days === 90 ? '3 ay' : '1 yıl'}
 </button>
 ))}
 </div>

 {/* Key Metrics Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 {/* Users Card */}
 <div className="bg-[var(--bg-card)] border border-[rgba(184,115,51,0.14)] rounded-sm p-4">
 <div className="flex items-center gap-3 mb-3">
 <Users className="w-5 h-5 text-[#7A6B58]" />
 <h3 className="font-medium text-[#7A6B58]">Kullanıcılar</h3>
 </div>
 <div className="space-y-1">
 <div className="text-2xl font-bold text-[#1F1410]">{data.overview.users.total}</div>
 <div className="text-xs text-[#7A6B58]">
 +{data.overview.users.new} yeni • {data.overview.users.active} aktif
 </div>
 </div>
 </div>

 {/* Content Card */}
 <div className="bg-[var(--bg-card)] border border-[rgba(184,115,51,0.14)] rounded-sm p-4">
 <div className="flex items-center gap-3 mb-3">
 <FileText className="w-5 h-5 text-green-600" />
 <h3 className="font-medium text-[#7A6B58]">İçerik</h3>
 </div>
 <div className="space-y-1">
 <div className="text-2xl font-bold text-[#1F1410]">{data.overview.content.places}</div>
 <div className="text-xs text-[#7A6B58]">
 {data.overview.content.reviews} inceleme • +{data.overview.content.newReviews}
 </div>
 </div>
 </div>

 {/* Flags Card */}
 <div className="bg-[var(--bg-card)] border border-[rgba(184,115,51,0.14)] rounded-sm p-4">
 <div className="flex items-center gap-3 mb-3">
 <Flag className="w-5 h-5 text-orange-600" />
 <h3 className="font-medium text-[#7A6B58]">Bayraklar</h3>
 </div>
 <div className="space-y-1">
 <div className="text-2xl font-bold text-orange-600">{data.overview.flags.pending}</div>
 <div className="text-xs text-[#7A6B58]">
 Beklemede • {data.overview.flags.resolved} çözüldü
 </div>
 </div>
 </div>

 {/* Moderation Card */}
 <div className="bg-[var(--bg-card)] border border-[rgba(184,115,51,0.14)] rounded-sm p-4">
 <div className="flex items-center gap-3 mb-3">
 <ShieldAlert className="w-5 h-5 text-red-600" />
 <h3 className="font-medium text-[#7A6B58]">Moderasyon</h3>
 </div>
 <div className="space-y-1">
 <div className="text-2xl font-bold text-red-600">{data.overview.moderation.totalActions}</div>
 <div className="text-xs text-[#7A6B58]">
 {data.overview.moderation.warnings} uyarı • {data.overview.moderation.bans} ban
 </div>
 </div>
 </div>
 </div>

 {/* Moderation Stats */}
 {data.moderation && (
 <div className="bg-[var(--bg-card)] border border-[rgba(184,115,51,0.14)] rounded-sm p-4">
 <h3 className="font-semibold text-[#1F1410] mb-4">Moderasyon İstatistikleri</h3>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div>
 <div className="text-xs text-[#7A6B58] mb-1">Beklemede</div>
 <div className="text-2xl font-bold text-orange-600">{data.moderation.queue.pending}</div>
 </div>
 <div>
 <div className="text-xs text-[#7A6B58] mb-1">İncelemede</div>
 <div className="text-2xl font-bold text-[#7A6B58]">{data.moderation.queue.inReview}</div>
 </div>
 <div>
 <div className="text-xs text-[#7A6B58] mb-1">Yüksek Önem Bayrakları</div>
 <div className="text-2xl font-bold text-red-600">{data.moderation.flags.highSeverity}</div>
 </div>
 <div>
 <div className="text-xs text-[#7A6B58] mb-1">Toplam Suspansyonlar</div>
 <div className="text-2xl font-bold text-[#B87333]">{data.moderation.actions.suspensions}</div>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
