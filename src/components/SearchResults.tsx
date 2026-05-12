import { useState, useEffect } from 'react';
interface Place {
 id: string;
 slug?: string;
 name: string;
 category: string;
 image_url?: string;
 rating?: number;
}

interface User {
 id: string;
 full_name: string;
 username?: string;
 avatar_url?: string;
}

interface Collection {
 id: string;
 name: string;
 description?: string;
}

interface SearchResults {
 places: Place[];
 users: User[];
 collections: Collection[];
}

export default function SearchResults({ query }: { query?: string }) {
 const [results, setResults] = useState<SearchResults | null>(null);
 const [isLoading, setIsLoading] = useState(Boolean(query && query.length >= 2));
 const [searchQuery, setSearchQuery] = useState(query || '');

 useEffect(() => {
 if (searchQuery.length >= 2) {
 performSearch();
 }
 }, [searchQuery]);

 const performSearch = async () => {
 setIsLoading(true);
 try {
 const response = await fetch('/api/search?q=' + encodeURIComponent(searchQuery) + '&limit=50');
 if (!response.ok) throw new Error('Arama tamamlanamadı.');
 const data = await response.json();
 setResults(data.data);
 } catch (err) {
 console.error('Arama hatası:', err);
 } finally {
 setIsLoading(false);
 }
 };

 return (
 <div className="space-y-8">
 <div className="mb-6">
 <input
 type="search"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Mekan, kullanıcı, koleksiyon veya ilçe ara..."
 className="min-h-12 w-full rounded-2xl border border-[#e3cfad] bg-white px-4 py-3 text-[#201711] shadow-sm outline-none transition placeholder:text-[#9a7a5c] focus:border-[#c0571f] focus:ring-4 focus:ring-[#c0571f]/10"
 />
 </div>

 {searchQuery.length < 2 ? (
 <div className="rounded-3xl border border-[#eadcc4] bg-white p-8 text-center shadow-sm">
 <p className="text-sm font-black uppercase tracking-[0.14em] text-[#8a3d22]">Arama hazır</p>
 <p className="mt-2 text-base font-semibold text-[#5f4a37]">Sonuçları görmek için en az 2 karakter girin.</p>
 </div>
 ) : isLoading ? (
 <div className="space-y-6 animate-pulse">
 <div>
 <div className="mb-3 h-5 w-32 rounded bg-[#eadcc4]" />
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {Array.from({ length: 4 }).map((_, i) => (
 <div key={i} className="space-y-3 rounded-2xl border border-[#eadcc4] bg-white p-4">
 <div className="h-4 w-3/4 rounded bg-[#eadcc4]" />
 <div className="h-3 w-1/2 rounded bg-[#f3e4cc]" />
 </div>
 ))}
 </div>
 </div>
 </div>
 ) : !results || (results.places.length === 0 && results.users.length === 0 && results.collections.length === 0) ? (
 <div className="rounded-3xl border border-[#eadcc4] bg-white px-6 py-12 text-center shadow-sm">
 <p className="text-sm font-black uppercase tracking-[0.14em] text-[#8a3d22]">Sonuç yok</p>
 <p className="mt-2 font-semibold text-[#201711]">"{searchQuery}" için sonuç bulunamadı.</p>
 <p className="mt-1 text-sm text-[#6d5945]">Balıklıgöl, Göbeklitepe, kebapçı, otel veya eczane gibi farklı bir kelime deneyin.</p>
 </div>
 ) : (
 <div className="space-y-8">
 {results.places && results.places.length > 0 && (
 <div>
 <h3 className="mb-4 text-2xl font-black text-[#201711]">Mekanlar ({results.places.length})</h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {results.places.map((place) => (
 <a key={place.id} href={place.slug ? `/isletme/${place.slug}` : '/mekanlar'} className="overflow-hidden rounded-2xl border border-[#eadcc4] bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#d39b62] hover:shadow-xl hover:shadow-[#78331d]/10">
 {place.image_url && <img src={place.image_url} alt={place.name} loading="lazy" width={400} height={144} className="h-36 w-full object-cover" />}
 <div className="p-4">
 <p className="font-black text-[#201711]">{place.name}</p>
 <p className="mt-1 text-sm text-[#6d5945]">{place.category}</p>
 {place.rating && <p className="mt-2 text-sm font-bold text-[#8a3d22]">Puan {place.rating.toFixed(1)}</p>}
 </div>
 </a>
 ))}
 </div>
 </div>
 )}

 {results.users && results.users.length > 0 && (
 <div>
 <h3 className="mb-4 text-2xl font-black text-[#201711]">Kullanıcılar ({results.users.length})</h3>
 <div className="space-y-3">
 {results.users.map((user) => (
 <a key={user.id} href={'/kullanici/' + user.id} className="flex items-center gap-3 rounded-2xl border border-[#eadcc4] bg-white p-4 shadow-sm transition hover:border-[#d39b62]">
 {user.avatar_url ? (
 <img src={user.avatar_url} alt={user.full_name} loading="lazy" width={44} height={44} className="h-11 w-11 rounded-full object-cover" />
 ) : (
 <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f3e4cc] text-sm font-black text-[#78331d]">
 {user.full_name.charAt(0)}
 </div>
 )}
 <div>
 <p className="font-black text-[#201711]">{user.full_name}</p>
 <p className="text-sm text-[#6d5945]">@{user.username || 'kullanici'}</p>
 </div>
 </a>
 ))}
 </div>
 </div>
 )}

 {results.collections && results.collections.length > 0 && (
 <div>
 <h3 className="mb-4 text-2xl font-black text-[#201711]">Koleksiyonlar ({results.collections.length})</h3>
 <div className="space-y-3">
 {results.collections.map((col) => (
 <a key={col.id} href={'/koleksiyonlar/' + col.id} className="block rounded-2xl border border-[#eadcc4] bg-white p-4 shadow-sm transition hover:border-[#d39b62]">
 <p className="font-black text-[#201711]">{col.name}</p>
 <p className="mt-1 text-sm text-[#6d5945]">{col.description}</p>
 </a>
 ))}
 </div>
 </div>
 )}

 {!results.places?.length && !results.users?.length && !results.collections?.length && (
 <p className="text-center text-[#6d5945]">Sonuç bulunamadı</p>
 )}
 </div>
 )}
 </div>
 );
}
