import { useState, useEffect } from 'react';
interface RecommendedUser {
 id: string;
 full_name: string;
 avatar_url?: string;
 level?: number;
 review_count?: number;
}

export default function UserRecommendations() {
 const [users, setUsers] = useState<RecommendedUser[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

 useEffect(() => {
 loadRecommendations();
 }, []);

 const loadRecommendations = async () => {
 try {
 const response = await fetch('/api/recommendations/users?limit=6');
 if (!response.ok) throw new Error('Failed');
 const data = await response.json();
 setUsers(data.data || []);
 } catch (err) {
 console.error('Kullanıcı önerileri yüklenemedi', err);
 } finally {
 setIsLoading(false);
 }
 };

 const toggleFollow = async (userId: string) => {
 try {
 const method = followingIds.has(userId) ? 'DELETE' : 'POST';
 const response = await fetch('/api/followers/' + userId, { method });
 if (!response.ok) throw new Error('Takip işlemi tamamlanamadı');
 
 const newSet = new Set(followingIds);
 if (newSet.has(userId)) {
 newSet.delete(userId);
 } else {
 newSet.add(userId);
 }
 setFollowingIds(newSet);
 } catch (err) {
 console.error('Takip işlemi tamamlanamadı', err);
 }
 };

 if (isLoading) return <div className="text-center py-8">Yükleniyor…</div>;
 if (users.length === 0) return null;

 return (
 <div className="space-y-4">
 <h3 className="text-lg font-bold text-[#1F1410]">Kime Takip Etmelisin?</h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {users.map((user) => (
 <div key={user.id} className="bg-[var(--bg-card)] p-4 rounded-sm border border-[rgba(184,115,51,0.14)] flex items-center justify-between">
 <a href={'/kullanici/' + user.id} className="flex items-center gap-3 flex-1">
 {user.avatar_url ? (
 <img src={user.avatar_url} alt={user.full_name} className="w-10 h-10 rounded-full object-cover" />
 ) : (
 <div className="w-10 h-10 rounded-full bg-[rgba(184,115,51,0.12)] flex items-center justify-center font-bold">
 {user.full_name.charAt(0)}
 </div>
 )}
 <div className="flex-1">
 <p className="font-medium text-[#1F1410]">{user.full_name}</p>
 <p className="text-xs text-[#7A6B58]">Seviye {user.level} • {user.review_count} inceleme</p>
 </div>
 </a>
 <button
 onClick={() => toggleFollow(user.id)}
 className="px-3 py-1 bg-urfa-600 hover:bg-urfa-700 text-white rounded text-sm font-medium"
 >
 Takip Et
 </button>
 </div>
 ))}
 </div>
 </div>
 );
}
