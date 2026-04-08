/**
 * Trending & Recommendations Component
 * Display trending content and personalized recommendations
 */

import React, { useState, useEffect } from 'react';

interface TrendingItem {
  id: string;
  entity_id: string;
  entity_type: string;
  score: number;
  view_count: number;
  interaction_count: number;
  share_count: number;
}

interface Recommendation {
  id: string;
  recommended_entity_id: string;
  recommended_entity_type: string;
  relevance_score: number;
  reason?: string;
}

type TabType = 'trending' | 'recommendations';
type PeriodType = 'hourly' | 'daily' | 'weekly';

export default function TrendingRecommendations() {
  const [tab, setTab] = useState<TabType>('trending');
  const [period, setPeriod] = useState<PeriodType>('daily');
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tab === 'trending') {
      loadTrending();
    } else {
      loadRecommendations();
    }
  }, [tab, period]);

  const loadTrending = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/trending?type=places&period=${period}&limit=20&keywords=true`);
      if (!response.ok) throw new Error('Failed to load trending');

      const result = await response.json();
      setTrending(result.data.trending || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading trending');
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/recommendations?limit=20');
      if (!response.ok) throw new Error('Failed to load recommendations');

      const result = await response.json();
      setRecommendations(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading recommendations');
    } finally {
      setLoading(false);
    }
  };

  const refreshRecommendations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/recommendations?refresh=true');
      if (!response.ok) throw new Error('Failed to refresh');
      const result = await response.json();
      setRecommendations(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error refreshing');
    } finally {
      setLoading(false);
    }
  };

  const trackInterest = async (category: string, action: string) => {
    try {
      await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, action })
      });
    } catch (err) {
      // Silent fail for tracking
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => setTab('trending')}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            tab === 'trending'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          🔥 Trending
        </button>
        <button
          onClick={() => setTab('recommendations')}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            tab === 'recommendations'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          ⭐ Tavsiyeler
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* Trending Tab */}
      {tab === 'trending' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Trend Yapanlar</h2>
            <div className="flex space-x-2">
              {(['hourly', 'daily', 'weekly'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-lg transition text-sm font-medium ${
                    period === p
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {p === 'hourly' ? 'Saatlik' : p === 'daily' ? 'Günlük' : 'Haftalık'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 animate-pulse rounded-lg"></div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4">
              {trending.map((item, idx) => (
                <div key={item.id} className="p-4 bg-white rounded-lg shadow hover:shadow-lg transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-2xl font-bold text-blue-600 w-8">#{idx + 1}</span>
                        <div>
                          <p className="font-semibold text-gray-900">Mekan #{item.entity_id.substring(0, 8)}</p>
                          <p className="text-sm text-gray-500">{item.entity_type}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{item.score.toFixed(0)}</p>
                      <p className="text-xs text-gray-500">puan</p>
                    </div>
                  </div>
                  <div className="flex space-x-4 mt-3 text-sm text-gray-600">
                    <span>👁️ {item.view_count} görüntüleme</span>
                    <span>💬 {item.interaction_count} etkileşim</span>
                    <span>🔗 {item.share_count} paylaşım</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recommendations Tab */}
      {tab === 'recommendations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Sizin İçin Önerilen</h2>
            <button
              onClick={refreshRecommendations}
              disabled={loading}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm font-medium"
            >
              🔄 Yenile
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 animate-pulse rounded-lg"></div>
              ))}
            </div>
          ) : recommendations.length > 0 ? (
            <div className="grid gap-4">
              {recommendations.map((rec, idx) => (
                <div
                  key={rec.id}
                  className="p-4 bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer"
                  onClick={() => trackInterest(rec.recommended_entity_type, 'click')}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-2xl font-bold text-green-600 w-8">#{idx + 1}</span>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {rec.recommended_entity_type}
                          </p>
                          {rec.reason && <p className="text-sm text-gray-600">{rec.reason}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        {(rec.relevance_score * 100).toFixed(0)}%
                      </p>
                      <p className="text-xs text-gray-500">uyum</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-gray-50 rounded-lg">
              <p className="text-gray-600">Henüz tavsiye yok. İlk mekanları ziyaret ederek başlayın!</p>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2">💡 Bilgi</h4>
        <p className="text-sm text-blue-800">
          Trend yapanlar sayfa popülaritesine göre sıralanır. Tavsiyeler ise sizin ilgi alanlarınıza göre kişiselleştirilir.
        </p>
      </div>
    </div>
  );
}
