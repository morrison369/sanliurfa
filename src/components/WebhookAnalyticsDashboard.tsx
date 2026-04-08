import React, { useState, useEffect } from 'react';

interface WebhookMetrics {
  totalWebhooks: number;
  totalEvents: number;
  deliveredEvents: number;
  failedEvents: number;
  pendingEvents: number;
  successRate: number;
  avgDeliveryTime: number;
  byEvent: Record<string, any>;
  lastHourActivity: any[];
  topFailedEvents: any[];
}

interface DashboardProps {
  token: string;
}

export default function WebhookAnalyticsDashboard({ token }: DashboardProps) {
  const [metrics, setMetrics] = useState<WebhookMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'failed'>('overview');

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadMetrics = async () => {
    try {
      const res = await fetch('/api/webhooks/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to load metrics');
      const data = await res.json();
      setMetrics(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Yükleniyor...</div>;
  }

  if (error || !metrics) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error || 'Failed to load metrics'}</p>
      </div>
    );
  }

  const getStatusColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Webhook Analitikleri</h2>
        <button
          onClick={loadMetrics}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
        >
          Yenile
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-gray-600 text-sm">Toplam Webhooks</p>
          <p className="text-3xl font-bold text-gray-900">{metrics.totalWebhooks}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-gray-600 text-sm">Toplam Olaylar</p>
          <p className="text-3xl font-bold text-gray-900">{metrics.totalEvents}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-gray-600 text-sm">Başarılı</p>
          <p className="text-3xl font-bold text-green-600">{metrics.deliveredEvents}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-gray-600 text-sm">Başarısız</p>
          <p className="text-3xl font-bold text-red-600">{metrics.failedEvents}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-gray-600 text-sm">Başarı Oranı</p>
          <p className={`text-3xl font-bold ${getStatusColor(metrics.successRate)}`}>
            {metrics.successRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="flex border-b">
          {(['overview', 'events', 'failed'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 text-center font-medium transition ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'overview' && 'Genel Bakış'}
              {tab === 'events' && 'Olaylar'}
              {tab === 'failed' && 'Başarısız'}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Son Saat Aktivitesi</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {metrics.lastHourActivity.slice(0, 20).map((activity, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                      <span className="text-gray-600">
                        {new Date(activity.time).toLocaleTimeString('tr-TR')}
                      </span>
                      <div className="flex gap-4">
                        <span className="text-blue-600">Gönderilen: {activity.sent}</span>
                        <span className="text-green-600">Teslim: {activity.delivered}</span>
                        <span className="text-red-600">Hata: {activity.failed}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 mb-4">Olay Türleri Başarı Oranları</h3>
              {Object.entries(metrics.byEvent).map(([event, stats]: [string, any]) => (
                <div key={event} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">{event}</h4>
                    <span className={`text-sm font-semibold ${getStatusColor(stats.successRate)}`}>
                      {stats.successRate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${Math.min(stats.successRate, 100)}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs text-gray-600">
                    <div>Toplam: {stats.total}</div>
                    <div>Başarılı: {stats.delivered}</div>
                    <div>Başarısız: {stats.failed}</div>
                    <div>Bekleme: {stats.pending}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'failed' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 mb-4">En Çok Başarısız Olaylar</h3>
              {metrics.topFailedEvents.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Başarısız olay yok 🎉</p>
              ) : (
                metrics.topFailedEvents.map((item, idx) => (
                  <div key={idx} className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{item.event}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {item.failedCount} başarısız, {item.attempts} toplam deneme
                        </p>
                      </div>
                      <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                        Yeniden Dene
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
