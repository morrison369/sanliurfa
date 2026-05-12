import { useState } from 'react';

interface User {
 id: string;
 full_name: string;
 username?: string;
 avatar_url?: string;
 bio?: string;
 points: number;
 level: number;
 created_at: string;
}

interface UserSearchResultsProps {
 currentUserId?: string;
}

export default function UserSearchResults({ currentUserId }: UserSearchResultsProps) {
 const [query, setQuery] = useState('');
 const [sortBy, setSortBy] = useState<'relevance' | 'points' | 'level' | 'recent'>('relevance');
 const [users, setUsers] = useState<User[]>([]);
 const [isLoading, setIsLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [hasSearched, setHasSearched] = useState(false);

 const handleSearch = async (e: React.SyntheticEvent<HTMLFormElement>) => {
 e.preventDefault();

 if (!query.trim() || query.length < 2) {
 setError('Arama terimi en az 2 karakter olmalıdır');
 return;
 }

 setIsLoading(true);
 setError(null);

 try {
 const response = await fetch(
 `/api/users/search?q=${encodeURIComponent(query.trim())}&sortBy=${sortBy}&limit=50`
 );

 if (!response.ok) {
 const data = await response.json();
 throw new Error(data.error || 'Arama başarısız');
 }

 const data = await response.json();
 setUsers(data.data || []);
 setHasSearched(true);
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Bir hata oluştu');
 setUsers([]);
 } finally {
 setIsLoading(false);
 }
 };

 const handleSortChange = async (newSort: typeof sortBy) => {
 setSortBy(newSort);
 if (query.trim()) {
 setIsLoading(true);
 try {
 const response = await fetch(
 `/api/users/search?q=${encodeURIComponent(query.trim())}&sortBy=${newSort}&limit=50`
 );

 if (response.ok) {
 const data = await response.json();
 setUsers(data.data || []);
 }
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Bir hata oluştu');
 } finally {
 setIsLoading(false);
 }
 }
 };

 const getLevelBadgeColor = (level: number) => {
 if (level <= 1) return 'bg-[rgba(184,115,51,0.06)] text-[#1F1410]';
 if (level <= 5) return 'bg-[rgba(59,130,246,0.1)] text-blue-300 ';
 if (level <= 10) return 'bg-[rgba(168,85,247,0.1)] text-purple-300 ';
 return 'bg-[rgba(234,179,8,0.12)] text-amber-400 ';
 };

 return (
 <div>
 {/* Search Form */}
 <form onSubmit={handleSearch} className="mb-8">
 <div className="flex flex-col sm:flex-row gap-4">
 <div className="flex-1">
 <input
 type="text"
 value={query}
 onChange={(e) => setQuery(e.target.value)}
 placeholder="Kullanıcı adı veya adı ara..."
 className="w-full px-4 py-3 border border-[rgba(184,115,51,0.25)] rounded-sm bg-[var(--bg-card)] text-[#1F1410] placeholder:text-[#4A3828] focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 </div>
 <button
 type="submit"
 disabled={isLoading}
 className="px-6 py-3 bg-urfa-600 text-white rounded-sm hover:bg-urfa-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
 >
 {isLoading ? '⟳' : '🔍'} Ara
 </button>
 </div>
 </form>

 {/* Sorting Options */}
 {hasSearched && (
 <div className="mb-6 flex flex-wrap gap-2">
 {[
 { value: 'relevance' as const, label: 'İlgililik' },
 { value: 'points' as const, label: 'Puan' },
 { value: 'level' as const, label: 'Seviye' },
 { value: 'recent' as const, label: 'Yeni' }
 ].map((option) => (
 <button
 key={option.value}
 onClick={() => handleSortChange(option.value)}
 className={`px-4 py-2 rounded-sm transition-colors font-medium text-sm ${
 sortBy === option.value
 ? 'bg-urfa-600 text-white'
 : 'bg-[rgba(184,115,51,0.08)] text-[#1F1410] hover:bg-[rgba(184,115,51,0.12)] '
 }`}
 >
 {option.label}
 </button>
 ))}
 </div>
 )}

 {/* Error Message */}
 {error && (
 <div className="mb-6 p-4 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] rounded-sm text-red-400 ">
 {error}
 </div>
 )}

 {/* Loading State */}
 {isLoading && (
 <div className="flex justify-center py-12">
 <p className="text-[#7A6B58]">Aranıyor...</p>
 </div>
 )}

 {/* Results */}
 {!isLoading && hasSearched && users.length === 0 && !error && (
 <div className="text-center py-12">
 <p className="text-[#7A6B58] mb-2">😕</p>
 <p className="text-[#7A6B58]">Sonuç bulunamadı</p>
 </div>
 )}

 {!isLoading && users.length > 0 && (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {users.map((user) => (
 <a
 key={user.id}
 href={`/kullanici/${user.id}`}
 className="bg-[var(--bg-card)] rounded-sm shadow border border-[rgba(184,115,51,0.14)] overflow-hidden hover:shadow-lg transition-shadow"
 >
 {/* Cover */}
 <div className="h-24 bg-gradient-to-r from-urfa-500 to-isot-700"></div>

 {/* Content */}
 <div className="px-4 py-4">
 {/* Avatar */}
 <div className="flex gap-4 mb-4">
 {user.avatar_url ? (
 <img
 src={user.avatar_url}
 alt={user.full_name}
 className="w-16 h-16 rounded-sm object-cover -mt-12 border-4 border-white "
 />
 ) : (
 <div className="w-16 h-16 rounded-sm bg-[rgba(184,115,51,0.12)] flex items-center justify-center -mt-12 border-4 border-white text-2xl">
 👤
 </div>
 )}
 <div className={`px-3 py-1 rounded-sm text-sm font-bold h-fit ${getLevelBadgeColor(user.level)}`}>
 Lv {user.level}
 </div>
 </div>

 {/* User Info */}
 <h3 className="font-bold text-[#1F1410] truncate">
 {user.full_name}
 </h3>
 {user.username && (
 <p className="text-sm text-[#7A6B58] truncate">
 @{user.username}
 </p>
 )}

 {user.bio && (
 <p className="text-sm text-[#7A6B58] line-clamp-2 mt-2">
 {user.bio}
 </p>
 )}

 {/* Stats */}
 <div className="mt-4 pt-4 border-t border-[rgba(184,115,51,0.14)] flex items-center justify-between">
 <div className="text-center flex-1">
 <p className="text-sm font-bold text-[#1F1410]">{user.points}</p>
 <p className="text-xs text-[#7A6B58]">Puan</p>
 </div>
 <div className="w-px bg-[rgba(184,115,51,0.08)] "></div>
 {currentUserId && currentUserId !== user.id && (
 <button
 onClick={(e) => {
 e.preventDefault();
 window.location.href = `/mesajlar?recipientId=${encodeURIComponent(user.id)}`;
 }}
 className="flex-1 text-center text-[#7A6B58] hover:text-[#1F1410] text-sm font-medium py-1"
 >
 💬 Mesaj
 </button>
 )}
 </div>
 </div>
 </a>
 ))}
 </div>
 )}

 {/* No Search State */}
 {!hasSearched && !isLoading && (
 <div className="text-center py-16">
 <p className="text-4xl mb-4">🔍</p>
 <p className="text-[#7A6B58] text-lg">
 Kullanıcı aramak için arama kutusunu kullanın
 </p>
 <p className="text-[#7A6B58] #7A6B58] text-sm mt-2">
 En az 2 karakter girin
 </p>
 </div>
 )}
 </div>
 );
}
