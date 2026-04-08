import React, { useState, useEffect } from 'react';
import { TrendingUp, Star } from 'lucide-react';

interface TrendingPlace {
  id: string;
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
    const fetch = async () => {
      try {
        const res = await fetch('/api/discovery/trending?limit=10');
        if (res.ok) {
          const { data } = await res.json();
          setTrending(data);
        }
      } catch (error) {
        console.error('Failed to fetch trending', error);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <div className="p-4">Yükleniyor...</div>;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-orange-500" />
        <h2 className="text-lg font-bold">Trending Mekanlar</h2>
      </div>
      <div className="divide-y max-h-96 overflow-y-auto">
        {trending.map((place, idx) => (
          <a key={place.id} href={`/mekanlari-bul/${place.id}`} className="p-4 hover:bg-gray-50 transition flex gap-3 items-start">
            <div className="bg-orange-100 text-orange-600 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0">
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{place.name}</h3>
              <p className="text-sm text-gray-600">{place.category}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-3 h-3 ${i < Math.floor(place.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                  ))}
                </div>
                <span className="text-xs text-gray-500">({place.review_count})</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
