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

 if (isLoading) return <div>Yükleniyor...</div>;
 if (!analytics) return <div>Veri yüklenemedi</div>;

 const { summary, topPlaces, topUsers } = analytics;

 return (
 <div className="space-y-6">
 <h2 className="text-2xl font-bold text-[#1F1410]">Analitik</h2>

 <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
 <div className="bg-[var(--bg-card)] p-4 rounded-sm border border-[rgba(184,115,51,0.14)]">
 <p className="text-sm text-[#7A6B58]">Toplam Kullanıcı</p>
 <p className="text-3xl font-bold text-[#1F1410]">{summary.totalUsers}</p>
 </div>
 <div className="bg-[var(--bg-card)] p-4 rounded-sm border border-[rgba(184,115,51,0.14)]">
 <p className="text-sm text-[#7A6B58]">Toplam İnceleme</p>
 <p className="text-3xl font-bold text-[#1F1410]">{summary.totalReviews}</p>
 </div>
 <div className="bg-[var(--bg-card)] p-4 rounded-sm border border-[rgba(184,115,51,0.14)]">
 <p className="text-sm text-[#7A6B58]">Toplam Mekan</p>
 <p className="text-3xl font-bold text-[#1F1410]">{summary.totalPlaces}</p>
 </div>
 <div className="bg-[var(--bg-card)] p-4 rounded-sm border border-[rgba(184,115,51,0.14)]">
 <p className="text-sm text-[#7A6B58]">Ort. Puan</p>
 <p className="text-3xl font-bold text-yellow-600">{summary.avgRating}⭐</p>
 </div>
 <div className="bg-[rgba(59,130,246,0.1)] p-4 rounded-sm border border-[rgba(59,130,246,0.2)]">
 <p className="text-sm text-[#7A6B58]">Bugün Aktif</p>
 <p className="text-3xl font-bold text-blue-300">{summary.activeToday}</p>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="bg-[var(--bg-card)] p-6 rounded-sm border border-[rgba(184,115,51,0.14)]">
 <h3 className="text-lg font-bold text-[#1F1410] mb-4">En Popüler Mekanlar</h3>
 <div className="space-y-3">
 {topPlaces.map((place, idx) => (
 <div key={place.id} className="flex justify-between items-start">
 <div>
 <p className="font-medium text-[#1F1410]">#{idx + 1} {place.name}</p>
 <p className="text-sm text-[#7A6B58]">{place.review_count} inceleme</p>
 </div>
 <p className="text-yellow-600">⭐{parseFloat(place.avg_rating || '0').toFixed(1)}</p>
 </div>
 ))}
 </div>
 </div>

 <div className="bg-[var(--bg-card)] p-6 rounded-sm border border-[rgba(184,115,51,0.14)]">
 <h3 className="text-lg font-bold text-[#1F1410] mb-4">En Aktif Kullanıcılar</h3>
 <div className="space-y-3">
 {topUsers.map((user, idx) => (
 <div key={user.id} className="flex justify-between items-start">
 <div>
 <p className="font-medium text-[#1F1410]">#{idx + 1} {user.full_name}</p>
 <p className="text-sm text-[#7A6B58]">{user.review_count} inceleme</p>
 </div>
 <p className="text-[#7A6B58]">{user.points} puan</p>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 );
}
