import { useEffect, useState } from 'react';

type MonitoringPayload = {
  upstreamHealth?: {
    transport?: Record<string, any> | null;
    weather?: Record<string, any> | null;
  };
  alarms?: {
    unreadDriftConversations?: number;
    reviewFlaggedLast24h?: number;
    cronFailureCount?: number;
    cronStaleCount?: number;
  };
  slo?: {
    apiP95Ms?: number;
    errorRatio?: number;
    cacheHitRatio?: number | null;
  };
  reviews?: {
    antiSpam?: {
      enabled?: boolean;
      autoModerateThreshold?: number;
      hardBlockThreshold?: number;
    };
  };
  cronHealth?: {
    items?: Array<{
      key: string;
      severity: 'green' | 'yellow' | 'red';
      updatedAt?: string | null;
      ageHours?: number | null;
      success?: boolean;
      stale?: boolean;
    }>;
  };
};

type AuditAnomalyPayload = {
  data?: {
    totalEvents?: number;
    socialAbuseRate?: number;
    suspiciousIpCount?: number;
  };
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Henüz yok';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Geçersiz tarih';
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parsed);
};

const severityLabel = (severity?: string) => {
  if (severity === 'red') return 'Kritik';
  if (severity === 'yellow') return 'Takip';
  return 'Sağlıklı';
};

const severityClass = (severity?: string) => {
  if (severity === 'red') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (severity === 'yellow') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
};

export default function SiteOperationsOverview() {
  const [monitoring, setMonitoring] = useState<MonitoringPayload | null>(null);
  const [audit, setAudit] = useState<AuditAnomalyPayload | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [monitoringRes, auditRes] = await Promise.all([
          fetch('/api/admin/monitoring'),
          fetch('/api/admin/site/audit/anomaly'),
        ]);

        if (!monitoringRes.ok) throw new Error('monitoring_failed');

        const monitoringJson = await monitoringRes.json();
        const auditJson = auditRes.ok ? await auditRes.json() : { data: {} };

        if (!active) return;

        setMonitoring(monitoringJson);
        setAudit(auditJson);
        setStatus('ready');
      } catch {
        if (!active) return;
        setStatus('error');
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  if (status === 'loading') {
    return (
      <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-600">Operasyon özeti yükleniyor...</p>
      </section>
    );
  }

  if (status === 'error' || !monitoring) {
    return (
      <section className="mb-6 rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
        <h2 className="text-lg font-bold text-rose-900">Operasyon özeti alınamadı</h2>
        <p className="mt-1 text-sm text-rose-700">
          Monitoring veya audit endpoint yanıt vermedi. Gate geçtiği için bu durum muhtemelen oturum/yetki kaynaklıdır.
        </p>
      </section>
    );
  }

  const cronItems = monitoring.cronHealth?.items || [];
  const topCronItems = cronItems.slice(0, 4);
  const transportUpdated = formatDate(monitoring.upstreamHealth?.transport?.at || monitoring.upstreamHealth?.transport?.updatedAt || null);
  const weatherUpdated = formatDate(monitoring.upstreamHealth?.weather?.at || monitoring.upstreamHealth?.weather?.updatedAt || null);

  return (
    <section className="mb-6 rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(248,113,113,0.08),transparent_35%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_35%),#ffffff] p-6 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Admin Ops</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">İçerik ve operasyon komuta özeti</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Landing tazeliği, cron sağlığı, anti-spam ve audit sinyalleri tek ekranda.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700">
            Ulaşım: {transportUpdated}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700">
            Hava durumu: {weatherUpdated}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="API p95"
          value={`${Math.round(Number(monitoring.slo?.apiP95Ms || 0))} ms`}
          hint={`Hata oranı ${(Number(monitoring.slo?.errorRatio || 0) * 100).toFixed(2)}%`}
        />
        <MetricCard
          label="Cron Alarmı"
          value={`${Number(monitoring.alarms?.cronFailureCount || 0)} kritik / ${Number(monitoring.alarms?.cronStaleCount || 0)} gecikmiş`}
          hint="Nightly ve retention işlerinin güncelliği"
        />
        <MetricCard
          label="Yorum Anti-Spam"
          value={monitoring.reviews?.antiSpam?.enabled ? 'Açık' : 'Kapalı'}
          hint={`Otomatik ${monitoring.reviews?.antiSpam?.autoModerateThreshold || 0} / Sert blok ${monitoring.reviews?.antiSpam?.hardBlockThreshold || 0}`}
        />
        <MetricCard
          label="Audit Riski"
          value={`%${Number(audit?.data?.socialAbuseRate || 0).toFixed(2)}`}
          hint={`${Number(audit?.data?.suspiciousIpCount || 0)} şüpheli IP / ${Number(audit?.data?.totalEvents || 0)} olay`}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Cron ve görev görünümü</h3>
            <a href="/admin/monitoring" className="text-sm font-semibold text-red-700 hover:text-red-800">
              Detay izleme →
            </a>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {topCronItems.map((item) => (
              <div key={item.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{item.key}</p>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${severityClass(item.severity)}`}>
                    {severityLabel(item.severity)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {item.updatedAt ? `Son çalışma: ${formatDate(item.updatedAt)}` : 'Henüz görev kaydı yok'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.ageHours == null ? 'Yaş bilgisi yok' : `${item.ageHours.toFixed(1)} saat önce`} / {item.success ? 'başarılı' : 'başarısız'}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-lg font-bold text-slate-900">Hızlı aksiyonlar</h3>
          <div className="mt-4 space-y-3">
            <QuickLink
              href="/admin/site-content"
              title="Hero ve landing bloklarını düzenle"
              text="Hero, section copy, footer ve medya kütüphanesi."
            />
            <QuickLink
              href="/admin/monitoring"
              title="Alarm ve tazelik detayına git"
              text="Cron, okunmamış mesaj sapması, işaretlenen yorum ve çalışma zamanı sağlığı."
            />
            <QuickLink
              href="/admin/social-risk"
              title="Sosyal risk ekranını aç"
              text="Takip, mesaj ve swipe kötüye kullanım sinyalleri."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricCard(props: { label: string; value: string; hint: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{props.label}</p>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{props.value}</p>
      <p className="mt-2 text-sm text-slate-600">{props.hint}</p>
    </article>
  );
}

function QuickLink(props: { href: string; title: string; text: string }) {
  return (
    <a href={props.href} className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-red-300 hover:bg-white">
      <p className="font-semibold text-slate-900">{props.title}</p>
      <p className="mt-1 text-sm text-slate-600">{props.text}</p>
    </a>
  );
}
