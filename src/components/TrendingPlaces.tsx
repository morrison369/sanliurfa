import { useState, useEffect } from 'react';
import { TrendingUp, Star } from 'lucide-react';

interface TrendingPlace {
 id: string;
 slug?: string;
 name: string;
 category: string;
 rating: number;
 review_count: number;
 engagement_score: number;
}

export default function TrendingPlaces() {
 const [trending, setTrending] = useState<TrendingPlace[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 const fetchTrending = async () => {
 try {
 const res = await fetch('/api/discovery/trending?limit=10');
 if (res.ok) {
 const { data } = await res.json();
 setTrending(data);
 }
 } catch (error) {
 console.error('Trend mekanlar yüklenemedi', error);
 } finally {
 setLoading(false);
 }
 };
 fetchTrending();
 }, []);

 if (loading) return <div className="p-4">Yükleniyor...</div>;

 return (
 <div className="bg-[var(--bg-card)] rounded-sm shadow">
 <div className="p-4 border-b flex items-center gap-2">
 <TrendingUp className="w-5 h-5 text-orange-500" />
 <h2 className="text-lg font-bold">Trend Mekanlar</h2>
 </div>
 <div className="divide-y max-h-96 overflow-y-auto">
 {trending.map((place, idx) => (
 <a
 key={place.id}
 href={place.slug ? `/isletme/${place.slug}` : '/mekanlar'}
 className="p-4 hover:bg-[rgba(184,115,51,0.04)] transition flex gap-3 items-start"
 >
 <div className="bg-[rgba(249,115,22,0.12)] text-orange-400 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0">
 {idx + 1}
 </div>
 <div className="flex-1 min-w-0">
 <h3 className="font-semibold truncate">{place.name}</h3>
 <p className="text-sm text-[#7A6B58]">{place.category}</p>
 <div className="flex items-center gap-2 mt-1">
 <div className="flex items-center gap-1">
 {Array.from({ length: 5 }).map((_, i) => (
 <Star key={i} className={`w-3 h-3 ${i < Math.floor(place.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-[#4A3828]'}`} />
 ))}
 </div>
 <span className="text-xs text-[#7A6B58]">({place.review_count})</span>
 </div>
 </div>
 </a>
 ))}
 </div>
 </div>
 );
}
