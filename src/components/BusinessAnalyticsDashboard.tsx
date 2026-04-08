/**
 * Business Analytics Dashboard Component
 * Comprehensive business analytics and insights for place owners
 */
import { useEffect, useState } from 'react';

interface Analytics {
  totalVisitors: number;
  avgRating: number;
  reviewCount: number;
  followerCount: number;
}

interface Metric {
  date: string;
  view_count: number;
  review_count: number;
  average_rating: number;
  new_followers: number;
}

interface Insight {
  id: string;
  title: string;
  description: string;
  priority: string;
  action_recommendation: string;
  estimated_impact: string;
}

export function BusinessAnalyticsDashboard() {
  const [placeId, setPlaceId] = useState<string>('');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('placeId') || '';
    setPlaceId(id);

    if (id) {
      fetchData(id);
    }
  }, [days]);

  const fetchData = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const [analyticsRes, insightsRes] = await Promise.all([
        fetch(`/api/business/analytics?placeId=${id}&days=${days}`),
        fetch(`/api/business/insights?placeId=${id}&limit=10`)
      ]);

      if (!analyticsRes.ok || !insightsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const analyticsData = await analyticsRes.json();
      const insightsData = await insightsRes.json();

      if (analyticsData.data?.analytics) {
        setAnalytics({
          totalVisitors: analyticsData.data.analytics.totalVisitors || 0,
          avgRating: analyticsData.data.analytics.avgRating || 0,
          reviewCount: analyticsData.data.analytics.reviewCount || 0,
          followerCount: analyticsData.data.analytics.followerCount || 0
        });
      }

      setMetrics(analyticsData.data?.metrics || []);
      setInsights(insightsData.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeInsight = async (insightId: string) => {
    try {
      const res = await fetch('/api/business/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId,
          insightId,
          action: 'acknowledge'
        })
      });

      if (res.ok) {
        setInsights(insights.filter((i) => i.id !== insightId));
      }
    } catch (err) {
      console.error('Failed to acknowledge insight', err);
    }
  };

  if (!placeId) {
    return <div className="p-4 text-center text-gray-500">Mekan seçilmedi</div>;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg h-20 animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">{error}</div>;
  }

  const totalMetrics = metrics.reduce((acc, m) => ({
    views: (acc.views || 0) + (m.view_count || 0),
    reviews: (acc.reviews || 0) + (m.review_count || 0),
    followers: (acc.followers || 0) + (m.new_followers || 0)
  }), { views: 0, reviews: 0, followers: 0 });

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              days === d
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {d} Gün
          </button>
        ))}
      </div>

      {/* Overview Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <p className="text-gray-600 text-sm">Toplam Ziyaretçi</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{analytics.totalVisitors.toLocaleString()}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <p className="text-gray-600 text-sm">Ortalama Puan</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{analytics.avgRating.toFixed(1)}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
            <p className="text-gray-600 text-sm">İnceleme Sayısı</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">{analytics.reviewCount}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
            <p className="text-gray-600 text-sm">Takipçi</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">{analytics.followerCount}</p>
          </div>
        </div>
      )}

      {/* Period Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Bu Dönemde Görüntülenme</p>
          <p className="text-2xl font-bold mt-2">{totalMetrics.views}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Bu Dönemde İnceleme</p>
          <p className="text-2xl font-bold mt-2">{totalMetrics.reviews}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Yeni Takipçiler</p>
          <p className="text-2xl font-bold mt-2">{totalMetrics.followers}</p>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">🔍 AI Önerileri</h3>
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={`border-l-4 p-4 rounded ${
                insight.priority === 'high'
                  ? 'border-red-500 bg-red-50'
                  : insight.priority === 'medium'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-blue-500 bg-blue-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold">{insight.title}</h4>
                  <p className="text-sm text-gray-700 mt-1">{insight.description}</p>
                  <p className="text-xs text-gray-600 mt-2">💡 {insight.action_recommendation}</p>
                  <p className="text-xs text-gray-600 mt-1">📈 Beklenen Etki: {insight.estimated_impact}</p>
                </div>
                <button
                  onClick={() => handleAcknowledgeInsight(insight.id)}
                  className="ml-4 px-3 py-1 text-xs bg-white rounded border border-gray-300 hover:bg-gray-100"
                >
                  Anladım
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Daily Metrics Chart Placeholder */}
      {metrics.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Günlük Trendler</h3>
          <div className="space-y-2 text-sm">
            <p>📊 {metrics.length} günlük veri bulunmaktadır</p>
            <p className="text-gray-500">Grafik görüntülemesi yakında eklenecek</p>
          </div>
        </div>
      )}
    </div>
  );
}
