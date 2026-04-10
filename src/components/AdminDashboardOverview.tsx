/**
 * Admin Dashboard Overview Component
 * Main dashboard with metrics and alerts
 */
import React, { useState, useEffect } from 'react';
import { AlertCircle, Users, FileText, Flag, ShieldAlert, KeyRound } from 'lucide-react';

interface DashboardData {
  overview: {
    users: { total: number; new: number; active: number };
    content: { places: number; reviews: number; comments: number; newReviews: number };
    flags: { pending: number; resolved: number; total: number };
    moderation: { totalActions: number; warnings: number; suspensions: number; bans: number };
    period: number;
  };
  metrics: any;
  moderation: any;
  integrations: {
    resend: { configured: boolean; source: 'env' | 'admin' | 'none' };
    analytics: { configured: boolean; source: 'env' | 'admin' | 'none' };
    summary?: { configuredCount: number; total: number; fullyConfigured: boolean };
    verification?: {
      resend: { status: string; message: string; checkedAt: string };
      analytics: { status: string; message: string; checkedAt: string };
      summary: { healthy: boolean; checkedAt: string };
    };
  };
  operational?: {
    oauth: {
      callback: { errorRatePercent: number; sampleSize: number };
    };
    webhook: {
      stripe: { errorRatePercent: number; p95DurationMs: number; duplicateRatePercent?: number; sampleSize: number };
    };
    search: {
      periodDays: number;
      totalTopSearches: number;
      topQueries: Array<{ query: string; count: number }>;
    };
  };
  releaseGate?: {
    available: boolean;
    generatedAt: string | null;
    finalStatus: 'passed' | 'failed' | 'missing';
    blockingFailedSteps: string[];
    advisoryFailedSteps: string[];
    failedStepCount: number;
  };
}

export default function AdminDashboardOverview() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/dashboard/overview?days=${period}`);
        const json = await res.json();

        if (!json.success) {
          setError(json.error || 'Veri alınırken bir hata oluştu');
          return;
        }

        setData(json.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-red-900">Hata</h3>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2">
        {[7, 30, 90, 365].map((days) => (
          <button
            key={days}
            onClick={() => setPeriod(days)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              period === days
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {days === 7 ? '7 gün' : days === 30 ? '30 gün' : days === 90 ? '3 ay' : '1 yıl'}
          </button>
        ))}
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Users Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-gray-700">Kullanıcılar</h3>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-gray-900">{data.overview.users.total}</div>
            <div className="text-xs text-gray-500">
              +{data.overview.users.new} yeni • {data.overview.users.active} aktif
            </div>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <FileText className="w-5 h-5 text-green-600" />
            <h3 className="font-medium text-gray-700">İçerik</h3>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-gray-900">{data.overview.content.places}</div>
            <div className="text-xs text-gray-500">
              {data.overview.content.reviews} inceleme • +{data.overview.content.newReviews}
            </div>
          </div>
        </div>

        {/* Flags Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <Flag className="w-5 h-5 text-orange-600" />
            <h3 className="font-medium text-gray-700">Bayraklar</h3>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-orange-600">{data.overview.flags.pending}</div>
            <div className="text-xs text-gray-500">
              Beklemede • {data.overview.flags.resolved} çözüldü
            </div>
          </div>
        </div>

        {/* Moderation Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <h3 className="font-medium text-gray-700">Moderasyon</h3>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-red-600">{data.overview.moderation.totalActions}</div>
            <div className="text-xs text-gray-500">
              {data.overview.moderation.warnings} uyarı • {data.overview.moderation.bans} ban
            </div>
          </div>
        </div>

        {/* Integrations Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <KeyRound className="w-5 h-5 text-indigo-600" />
            <h3 className="font-medium text-gray-700">Entegrasyonlar</h3>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-indigo-600">
              {data.integrations?.summary?.configuredCount ??
                (Number(data.integrations?.resend?.configured) + Number(data.integrations?.analytics?.configured))}
              /{data.integrations?.summary?.total || 2}
            </div>
            <div className="text-xs text-gray-500">
              RESEND: {data.integrations?.resend?.source || 'none'} • Analytics: {data.integrations?.analytics?.source || 'none'}
            </div>
            <div className="text-xs text-gray-500">
              Durum: {data.integrations?.summary?.fullyConfigured ? 'healthy' : 'degraded'}
            </div>
            <div className="text-xs text-gray-500">
              Doğrulama: {data.integrations?.verification?.summary?.healthy ? 'verified' : 'review'}
            </div>
          </div>
        </div>
      </div>

      {/* Moderation Stats */}
      {data.moderation && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Moderasyon İstatistikleri</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Beklemede</div>
              <div className="text-2xl font-bold text-orange-600">{data.moderation.queue.pending}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">İncelemede</div>
              <div className="text-2xl font-bold text-blue-600">{data.moderation.queue.inReview}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Yüksek Önem Bayrakları</div>
              <div className="text-2xl font-bold text-red-600">{data.moderation.flags.highSeverity}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Toplam Suspansyonlar</div>
              <div className="text-2xl font-bold text-purple-600">{data.moderation.actions.suspensions}</div>
            </div>
          </div>
        </div>
      )}

      {/* Operational Snapshot */}
      {data.operational && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Operasyon Özeti</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">OAuth Callback Hata</div>
              <div className="text-xl font-bold text-gray-900">
                %{data.operational.oauth.callback.errorRatePercent}
              </div>
              <div className="text-xs text-gray-500">
                Örnek: {data.operational.oauth.callback.sampleSize}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Stripe Webhook</div>
              <div className="text-xl font-bold text-gray-900">
                %{data.operational.webhook.stripe.errorRatePercent} / p95 {data.operational.webhook.stripe.p95DurationMs}ms
              </div>
              <div className="text-xs text-gray-500">
                Duplicate %{data.operational.webhook.stripe.duplicateRatePercent || 0} • Örnek: {data.operational.webhook.stripe.sampleSize}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Arama Trendi ({data.operational.search.periodDays} gün)</div>
              <div className="text-xl font-bold text-gray-900">{data.operational.search.totalTopSearches}</div>
              <div className="text-xs text-gray-500 truncate">
                {data.operational.search.topQueries?.[0]
                  ? `${data.operational.search.topQueries[0].query} (${data.operational.search.topQueries[0].count})`
                  : 'Veri yok'}
              </div>
            </div>
          </div>
        </div>
      )}

      {data.integrations?.verification && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Entegrasyon Doğrulama</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">RESEND</div>
              <div className="text-xl font-bold text-gray-900">{data.integrations.verification.resend.status}</div>
              <div className="text-xs text-gray-500">{data.integrations.verification.resend.message}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Analytics</div>
              <div className="text-xl font-bold text-gray-900">{data.integrations.verification.analytics.status}</div>
              <div className="text-xs text-gray-500">{data.integrations.verification.analytics.message}</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-3">
            Son kontrol: {data.integrations.verification.summary.checkedAt}
          </div>
        </div>
      )}

      {data.releaseGate && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Release Gate</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Durum</div>
              <div className="text-xl font-bold text-gray-900">{data.releaseGate.finalStatus}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Hata Sayısı</div>
              <div className="text-xl font-bold text-gray-900">{data.releaseGate.failedStepCount}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Son Üretim</div>
              <div className="text-sm text-gray-900">{data.releaseGate.generatedAt || 'Henüz yok'}</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-3">
            Blocking: {data.releaseGate.blockingFailedSteps[0] || 'yok'} • Advisory: {data.releaseGate.advisoryFailedSteps[0] || 'yok'}
          </div>
        </div>
      )}
    </div>
  );
}
