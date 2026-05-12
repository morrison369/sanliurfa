import { useState, useEffect } from 'react';
interface Activity {
 id: string;
 actionType: string;
 metadata?: {
 placeName?: string;
 };
 createdAt: string;
}

export default function MyActivityLog() {
 const [activities, setActivities] = useState<Activity[]>([]);
 const [isLoading, setIsLoading] = useState(true);

 useEffect(() => {
 loadActivities();
 }, []);

 const loadActivities = async () => {
 try {
 const response = await fetch('/api/feed?type=personal&limit=50');
 if (!response.ok) throw new Error('Failed');
 const data = await response.json();
 setActivities(data.data || []);
 } catch (err) {
 console.error('Error', err);
 } finally {
 setIsLoading(false);
 }
 };

 if (isLoading) return <div className="text-center py-8">Yükleniyor...</div>;

 const getActivityIcon = (type: string) => {
 const icons: Record<string, string> = {
 'review_created': '⭐',
 'favorite_added': '❤️',
 'comment_posted': '💬',
 'collection_created': '📚',
 'user_followed': '👥'
 };
 return icons[type] || '📌';
 };

 const getActivityText = (type: string) => {
 const texts: Record<string, string> = {
 'review_created': 'İnceleme yazdın',
 'favorite_added': 'Favorilere ekledi',
 'comment_posted': 'Yorum yaptın',
 'collection_created': 'Koleksiyon oluşturdu',
 'user_followed': 'Kullanıcı takip ettin'
 };
 return texts[type] || 'Aktivite';
 };

 return (
 <div className="space-y-4">
 <h2 className="text-2xl font-bold text-[#1F1410]">Aktivitelerim</h2>

 {activities.length === 0 ? (
 <p className="text-center text-[#7A6B58] py-8">Henüz aktivite yok</p>
 ) : (
 <div className="space-y-2">
 {activities.map((activity) => (
 <div key={activity.id} className="bg-[var(--bg-card)] p-4 rounded-sm border border-[rgba(184,115,51,0.14)] hover:shadow-md transition-shadow">
 <div className="flex items-start gap-3">
 <span className="text-2xl">{getActivityIcon(activity.actionType)}</span>
 <div className="flex-1">
 <p className="font-medium text-[#1F1410]">
 {getActivityText(activity.actionType)}
 </p>
 {activity.metadata?.placeName && (
 <p className="text-sm text-[#7A6B58]">
 {activity.metadata.placeName}
 </p>
 )}
 <p className="text-xs text-[#7A6B58] mt-2">
 {new Date(activity.createdAt).toLocaleDateString('tr-TR', {
 year: 'numeric',
 month: 'long',
 day: 'numeric',
 hour: '2-digit',
 minute: '2-digit'
 })}
 </p>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 );
}
