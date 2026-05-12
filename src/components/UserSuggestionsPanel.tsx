import { useState, useEffect } from 'react';
interface SuggestedUser {
 id: string;
 name: string;
 username: string;
 avatar?: string;
 isFollowing: boolean;
 activityCount: number;
 matchingInterests: number;
}

export default function UserSuggestionsPanel() {
 const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [followingId, setFollowingId] = useState<string | null>(null);
 const [isFollowing, setIsFollowing] = useState(false);

 useEffect(() => {
 loadSuggestions();
 }, []);

 const loadSuggestions = async () => {
 try {
 setIsLoading(true);
 setError(null);
 const response = await fetch('/api/users/suggestions?limit=6');

 if (!response.ok) {
 throw new Error('Öneriler yüklenemedi');
 }

 const data = await response.json();
 setSuggestions(data.suggestions || []);
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Bir hata oluştu');
 } finally {
 setIsLoading(false);
 }
 };

 const handleFollowUser = async (userId: string, currentlyFollowing: boolean) => {
 if (isFollowing) return;

 setFollowingId(userId);
 setIsFollowing(true);

 try {
 const endpoint = currentlyFollowing ? `/api/following/unfollow` : `/api/following/${userId}`;
 const method = currentlyFollowing ? 'DELETE' : 'POST';

 const response = await fetch(endpoint, { method });

 if (!response.ok) {
 throw new Error('İşlem başarısız');
 }

 // Update suggestion status
 setSuggestions(
 suggestions.map((s) =>
 s.id === userId ? { ...s, isFollowing: !currentlyFollowing } : s
 )
 );
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Bir hata oluştu');
 } finally {
 setFollowingId(null);
 setIsFollowing(false);
 }
 };

 if (isLoading) {
 return (
 <div className="text-center py-8">
 <p className="text-[#7A6B58]">Yükleniyor...</p>
 </div>
 );
 }

 if (suggestions.length === 0) {
 return (
 <div className="text-center py-8 text-[#7A6B58]">
 <p>Şu an için öneri yok</p>
 </div>
 );
 }

 return (
 <div className="space-y-4">
 {error && (
 <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] rounded-sm text-red-400 text-sm">
 {error}
 </div>
 )}

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {suggestions.map((user) => (
 <div
 key={user.id}
 className="bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-4 hover:shadow-md transition-shadow"
 >
 <div className="flex items-center gap-3 mb-3">
 {user.avatar ? (
 <img
 src={user.avatar}
 alt={user.name}
 className="w-10 h-10 rounded-full object-cover"
 />
 ) : (
 <div className="w-10 h-10 rounded-full bg-gradient-to-br from-urfa-500 to-isot-600 flex items-center justify-center text-white font-bold text-sm">
 {user.name.charAt(0)}
 </div>
 )}

 <div className="flex-1 min-w-0">
 <h3 className="font-medium text-[#1F1410] truncate">
 {user.name}
 </h3>
 <p className="text-sm text-[#7A6B58] truncate">
 @{user.username}
 </p>
 </div>
 </div>

 {/* Activity Info */}
 <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
 <div className="text-center p-2 bg-[rgba(184,115,51,0.04)] rounded">
 <p className="text-[#7A6B58]">Aktivite</p>
 <p className="font-bold text-[#1F1410]">{user.activityCount}</p>
 </div>
 {user.matchingInterests > 0 && (
 <div className="text-center p-2 bg-[rgba(59,130,246,0.1)] rounded">
 <p className="text-[#7A6B58] ">Ortak İlgi</p>
 <p className="font-bold text-blue-300 ">{user.matchingInterests}</p>
 </div>
 )}
 </div>

 {/* Follow Button */}
 <button
 onClick={() => handleFollowUser(user.id, user.isFollowing)}
 disabled={isFollowing && followingId === user.id}
 className={`w-full py-2 px-3 rounded-sm font-medium text-sm transition-colors ${
 user.isFollowing
 ? 'bg-[rgba(184,115,51,0.08)] text-[#1F1410] hover:bg-[rgba(184,115,51,0.12)] '
 : 'bg-urfa-600 text-white hover:bg-urfa-700'
 } disabled:opacity-50 disabled:cursor-not-allowed`}
 >
 {isFollowing && followingId === user.id
 ? 'İşleniyor...'
 : user.isFollowing
 ? 'Takip Ediliyor'
 : 'Takip Et'}
 </button>

 {/* View Profile Link */}
 <a
 href={`/kullanici/${user.id}`}
 className="block text-center text-sm text-[#7A6B58] hover:text-[#1F1410] mt-2 py-1"
 >
 Profili Görüntüle
 </a>
 </div>
 ))}
 </div>

 <button
 onClick={loadSuggestions}
 className="w-full py-2 px-4 text-sm text-[#7A6B58] hover:text-[#1F1410] border border-urfa-500 rounded-sm font-medium transition-colors"
 >
 Yeni Öneriler Yükle
 </button>
 </div>
 );
}
