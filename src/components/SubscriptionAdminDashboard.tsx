/**
 * Subscription Admin Dashboard Component
 * Dashboard for managing subscriptions and viewing analytics
 */

import React, { useState, useEffect } from 'react';

interface Analytics {
  subscriptions: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    cancelledSubscriptions: number;
    byTier: Record<string, number>;
    mrr: number;
    arr: number;
    churnRate: number;
  };
  webhooks: {
    pending: number;
    failed: number;
    successful: number;
    retrying: number;
  };
}

interface SubscriptionAdminDashboardProps {}

export default function SubscriptionAdminDashboard({}: SubscriptionAdminDashboardProps) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'webhooks'>('overview');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/subscriptions/analytics');

        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }

        const data = await response.json() as any;
        setAnalytics(data.subscriptions || null);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <p className="text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
        <p className="text-gray-600 dark:text-gray-400">Veri yüklenemedi</p>
      </div>
    );
  }

  const mrrDisplay = analytics.subscriptions.mrr.toFixed(2);
  const arrDisplay = analytics.subscriptions.arr.toFixed(2);
  const churnPercentage = analytics.subscriptions.churnRate.toFixed(1);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          Özet
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === 'users'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          Kullanıcılar
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === 'webhooks'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          Webhook'lar
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Toplam Abonelik</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {analytics.subscriptions.totalSubscriptions}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Aktif</h3>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {analytics.subscriptions.activeSubscriptions}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Aylık Gelir (MRR)</h3>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">₺{mrrDisplay}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Churn Oranı</h3>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">{churnPercentage}%</p>
            </div>
          </div>

          {/* Plan Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Plan Dağılımı</h3>
            <div className="space-y-3">
              {Object.entries(analytics.subscriptions.byTier).map(([tier, count]) => (
                <div key={tier} className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{tier}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600"
                        style={{
                          width: `${(count / analytics.subscriptions.activeSubscriptions) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue Summary */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Gelir Özeti</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Aylık Gelir (MRR)</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">₺{mrrDisplay}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Yıllık Değerleme (ARR)</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">₺{arrDisplay}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Kullanıcı Yönetimi</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Kullanıcıların abonelik durumunu ve planlarını yönetin. Aşağıdaki linke tıklayarak detaylı yönetim sayfasına gidin.
          </p>
          <a
            href="/admin/subscriptions/users"
            className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
          >
            Kullanıcı Yönetim Paneli →
          </a>
        </div>
      )}

      {activeTab === 'webhooks' && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Başarılı</h3>
              <p className="text-3xl font-bold text-green-600">
                {analytics.webhooks?.successful || 0}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Beklemede</h3>
              <p className="text-3xl font-bold text-yellow-600">
                {analytics.webhooks?.pending || 0}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Yeniden Deniyor</h3>
              <p className="text-3xl font-bold text-blue-600">
                {analytics.webhooks?.retrying || 0}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Başarısız</h3>
              <p className="text-3xl font-bold text-red-600">
                {analytics.webhooks?.failed || 0}
              </p>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              💡 Webhook delivery status'ını izleyin. Başarısız webhook'lar işleniyor ve otomatik olarak yeniden deniyor.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
