import React, { useState, useEffect } from 'react';
import { Lightbulb, Star } from 'lucide-react';

interface Recommendation {
  id: string;
  recommended_place_id: string;
  name: string;
  category: string;
  rating: number;
  recommendation_score: number;
}

export default function PersonalizedRecommendations() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await fetch('/api/discovery/recommendations?limit=8');
        if (res.ok) {
          const { data } = await res.json();
          setRecs(data);
        }
      } catch (error) {
        console.error('Failed to fetch recommendations', error);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleClick = async (recId: string) => {
    await fetch('/api/discovery/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'click', recommendation_id: recId }),
    });
  };

  if (loading) return <div className="p-4">Yükleniyor...</div>;
  if (recs.length === 0) return <div className="p-4 text-gray-500">Henüz tavsiye yok</div>;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-blue-500" />
        <h2 className="text-lg font-bold">Sizin İçin Önerilir</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        {recs.map(rec => (
          <a key={rec.id} onClick={() => handleClick(rec.id)} href={`/mekanlari-bul/${rec.recommended_place_id}`} className="p-3 border rounded-lg hover:bg-blue-50 transition cursor-pointer">
            <h3 className="font-semibold truncate">{rec.name}</h3>
            <p className="text-sm text-gray-600">{rec.category}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-3 h-3 ${i < Math.floor(rec.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                ))}
              </div>
              <span className="text-xs text-gray-500">%{Math.round(rec.recommendation_score * 100)}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
