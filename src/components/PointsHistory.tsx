import { useState, useEffect } from 'react';
interface HistoryItem {
 id: string;
 action_type: string;
 created_at: string;
 points_earned?: number;
}

interface SummaryItem {
 action_type: string;
 total_points: number;
 count: number;
}

interface HistoryData {
 summary: SummaryItem[];
 history: HistoryItem[];
}

export default function PointsHistory() {
 const [history, setHistory] = useState<HistoryData | null>(null);
 const [isLoading, setIsLoading] = useState(true);

 useEffect(() => {
 loadHistory();
 }, []);

 const loadHistory = async () => {
 try {
 const response = await fetch('/api/users/points-history');
 if (!response.ok) throw new Error('Failed');
 const data = await response.json();
 setHistory(data.data);
 } catch (err) {
 console.error('Error', err);
 } finally {
 setIsLoading(false);
 }
 };

 if (isLoading) return <div className="text-center py-8">Yükleniyor...</div>;
 if (!history) return <div>Veri yüklenemedi</div>;

 const getActivityIcon = (type: string) => {
 const icons: Record<string, string> = { 'review_created': '⭐', 'comment_posted': '💬', 'favorite_added': '❤️' };
 return icons[type] || '📌';
 };

 const getActivityLabel = (type: string) => {
 const labels: Record<string, string> = { 'review_created': 'İnceleme', 'comment_posted': 'Yorum', 'favorite_added': 'Favori' };
 return labels[type] || 'Aktivite';
 };

 return (
 <div className="space-y-6">
 <h2 className="text-2xl font-bold text-[#1F1410]">Puan Geçmişi</h2>

 <div className="grid grid-cols-3 gap-4 mb-6">
 {history.summary.map((item) => (
 <div key={item.action_type} className="bg-[var(--bg-card)] p-4 rounded-sm border border-[rgba(184,115,51,0.14)]">
 <p className="text-sm text-[#7A6B58]">{getActivityLabel(item.action_type)}</p>
 <p className="text-2xl font-bold text-[#7A6B58]">{item.total_points}</p>
 <p className="text-xs text-[#7A6B58]">{item.count} kez</p>
 </div>
 ))}
 </div>

 <div className="space-y-2">
 {history.history.map((entry) => (
 <div key={entry.id} className="flex items-center justify-between p-3 bg-[rgba(184,115,51,0.04)] rounded-sm">
 <div className="flex items-center gap-3">
 <span className="text-lg">{getActivityIcon(entry.action_type)}</span>
 <div>
 <p className="text-sm font-medium text-[#1F1410]">
 {getActivityLabel(entry.action_type)}
 </p>
 <p className="text-xs text-[#7A6B58]">
 {new Date(entry.created_at).toLocaleDateString('tr-TR')}
 </p>
 </div>
 </div>
 <span className="text-sm font-bold text-[#7A6B58]">+{entry.points_earned || 10}</span>
 </div>
 ))}
 </div>
 </div>
 );
}
