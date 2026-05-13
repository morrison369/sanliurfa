import { useState, useEffect } from 'react';
interface AnalyticsSummary {
 totalUsers: number;
 totalReviews: number;
 totalPlaces: number;
 avgRating: number;
 activeToday: number;
}

interface Place {
 id: string;
 name: string;
 review_count: number;
 avg_rating: string;
}

interface User {
 id: string;
 full_name: string;
 review_count: number;
 points: number;
}

interface AnalyticsData {
 summary: AnalyticsSummary;
 topPlaces: Place[];
 topUsers: User[];
}

export default function AnalyticsPanel() {
 const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
 const [isLoading, setIsLoading] = useState(true);

 useEffect(() => {
 loadAnalytics();
 }, []);

 const loadAnalytics = async () => {
 try {
 const response = await fetch('/api/analytics');
 if (!response.ok) throw new Error('Failed');
 const data = await response.json();
 setAnalytics(data.data);
 } catch (err) {
 console.error('Analytics error', err);
 } finally {
 setIsLoading(false);
 }
 };

 if (isLoading) return <div>Yükleniyor…</div>;
 if (!analytics) return <div>Veri yüklenemedi</div>;

 const { summary, topPlaces, topUsers } = analytics;

 return (
 <div className="space-y-6">
 <h2 className="text-2xl font-bold text-[var(--adm-text)]">Analitik</h2>

 <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
 <div className="bg-[var(--adm-bg-elev)] p-4 rounded-sm border border-[var(--adm-border)]">
 <p className="text-sm text-[var(--adm-text-muted)]">Toplam Kullanıcı</p>
 <p className="text-3xl font-bold text-[var(--adm-text)]">{summary.totalUsers}</p>
 </div>
 <div className="bg-[var(--adm-bg-elev)] p-4 rounded-sm border border-[var(--adm-border)]">
 <p className="text-sm text-[var(--adm-text-muted)]">Toplam İnceleme</p>
 <p className="text-3xl font-bold text-[var(--adm-text)]">{summary.totalReviews}</p>
 </div>
 <div className="bg-[var(--adm-bg-elev)] p-4 rounded-sm border border-[var(--adm-border)]">
 <p className="text-sm text-[var(--adm-text-muted)]">Toplam Mekan</p>
 <p className="text-3xl font-bold text-[var(--adm-text)]">{summary.totalPlaces}</p>
 </div>
 <div className="bg-[var(--adm-bg-elev)] p-4 rounded-sm border border-[var(--adm-border)]">
 <p className="text-sm text-[var(--adm-text-muted)]">Ort. Puan</p>
 <p className="text-3xl font-bold text-yellow-600">{summary.avgRating}⭐</p>
 </div>
 <div className="bg-[rgba(59,130,246,0.1)] p-4 rounded-sm border border-[rgba(59,130,246,0.2)]">
 <p className="text-sm text-[var(--adm-text-muted)]">Bugün Aktif</p>
 <p className="text-3xl font-bold text-blue-300">{summary.activeToday}</p>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="bg-[var(--adm-bg-elev)] p-6 rounded-sm border border-[var(--adm-border)]">
 <h3 className="text-lg font-bold text-[var(--adm-text)] mb-4">En Popüler Mekanlar</h3>
 <div className="space-y-3">
 {topPlaces.map((place, idx) => (
 <div key={place.id} className="flex justify-between items-start">
 <div>
 <p className="font-medium text-[var(--adm-text)]">#{idx + 1} {place.name}</p>
 <p className="text-sm text-[var(--adm-text-muted)]">{place.review_count} inceleme</p>
 </div>
 <p className="text-yellow-600">⭐{parseFloat(place.avg_rating || '0').toFixed(1)}</p>
 </div>
 ))}
 </div>
 </div>

 <div className="bg-[var(--adm-bg-elev)] p-6 rounded-sm border border-[var(--adm-border)]">
 <h3 className="text-lg font-bold text-[var(--adm-text)] mb-4">En Aktif Kullanıcılar</h3>
 <div className="space-y-3">
 {topUsers.map((user, idx) => (
 <div key={user.id} className="flex justify-between items-start">
 <div>
 <p className="font-medium text-[var(--adm-text)]">#{idx + 1} {user.full_name}</p>
 <p className="text-sm text-[var(--adm-text-muted)]">{user.review_count} inceleme</p>
 </div>
 <p className="text-[var(--adm-text-muted)]">{user.points} puan</p>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 );
}
