/**
 * Admin Dashboard Overview Component
 * Main dashboard with metrics and alerts — enterprise redesign 2026
 */
import { useState, useEffect } from 'react';
import { AlertCircle, Users, FileText, Flag, ShieldAlert, TrendingUp, Clock, Eye, AlertTriangle } from 'lucide-react';

interface DashboardData {
 overview: {
  users: { total: number; new: number; active: number };
  content: { places: number; reviews: number; comments: number; newReviews: number };
  flags: { pending: number; resolved: number; total: number };
  moderation: { totalActions: number; warnings: number; suspensions: number; bans: number };
  period: number;
 };
 metrics: Record<string, unknown>;
 moderation: {
  queue: { pending: number; inReview: number };
  flags: { highSeverity: number };
  actions: { suspensions: number };
 } | null;
}

const PERIOD_OPTIONS = [
 { days: 7, label: '7 gün' },
 { days: 30, label: '30 gün' },
 { days: 90, label: '3 ay' },
 { days: 365, label: '1 yıl' },
];

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
    // Resilient unwrap — handle both wrapped and direct shapes
    const payload = json?.data?.overview ? json.data : json?.data?.data?.overview ? json.data.data : null;
    if (!payload) {
     setError(json?.error || 'Veri formatı tanınamadı');
     return;
    }
    setData(payload);
    setError(null);
   } catch (err) {
    setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu');
   } finally {
    setLoading(false);
   }
  };
  fetchData();
 }, [period]);

 const cards = data ? [
  {
   key: 'users',
   icon: Users,
   label: 'Kullanıcılar',
   value: data.overview.users.total,
   metaPrimary: `+${data.overview.users.new} yeni`,
   metaSecondary: `${data.overview.users.active} aktif`,
   color: 'indigo' as const,
  },
  {
   key: 'content',
   icon: FileText,
   label: 'İçerik',
   value: data.overview.content.places,
   metaPrimary: `${data.overview.content.reviews} inceleme`,
   metaSecondary: `+${data.overview.content.newReviews} yeni`,
   color: 'emerald' as const,
  },
  {
   key: 'flags',
   icon: Flag,
   label: 'Bayraklar',
   value: data.overview.flags.pending,
   metaPrimary: 'Beklemede',
   metaSecondary: `${data.overview.flags.resolved} çözüldü`,
   color: 'amber' as const,
  },
  {
   key: 'moderation',
   icon: ShieldAlert,
   label: 'Moderasyon',
   value: data.overview.moderation.totalActions,
   metaPrimary: `${data.overview.moderation.warnings} uyarı`,
   metaSecondary: `${data.overview.moderation.bans} ban`,
   color: 'rose' as const,
  },
 ] : [];

 const colorMap: Record<string, { bg: string; fg: string }> = {
  indigo: { bg: 'rgba(99,102,241,0.12)', fg: 'rgb(99,102,241)' },
  emerald: { bg: 'rgba(16,185,129,0.12)', fg: 'rgb(5,150,105)' },
  amber: { bg: 'rgba(217,119,6,0.12)', fg: 'rgb(180,83,9)' },
  rose: { bg: 'rgba(225,29,72,0.12)', fg: 'rgb(190,18,60)' },
 };

 return (
  <div className="ado-page">
   <div className="ado-toolbar">
    <div className="ado-period-group" role="group" aria-label="Dönem seçimi">
     {PERIOD_OPTIONS.map((opt) => (
      <button
       key={opt.days}
       onClick={() => setPeriod(opt.days)}
       className={`ado-period ${period === opt.days ? 'ado-period--active' : ''}`}
       type="button"
      >
       {opt.label}
      </button>
     ))}
    </div>
    <div className="ado-period-hint">
     <Clock className="w-3 h-3" />
     <span>Son {period} gün</span>
    </div>
   </div>

   {error && (
    <div className="ado-error">
     <AlertCircle className="w-5 h-5" />
     <div>
      <strong>Veri yüklenemedi</strong>
      <p>{error}</p>
     </div>
    </div>
   )}

   {loading && !data && (
    <div className="ado-grid">
     {[1,2,3,4].map((i) => <div key={i} className="ado-skel-card" />)}
    </div>
   )}

   {data && (
    <>
     <div className="ado-grid">
      {cards.map((c) => {
       const cl = colorMap[c.color];
       const Icon = c.icon;
       return (
        <div
         key={c.key}
         className="ado-card"
         style={{ ['--ado-c-bg' as string]: cl.bg, ['--ado-c-fg' as string]: cl.fg }}
        >
         <div className="ado-card-row">
          <div className="ado-card-icon" aria-hidden="true">
           <Icon className="w-5 h-5" />
          </div>
          <div className="ado-card-val">{c.value.toLocaleString('tr-TR')}</div>
         </div>
         <div className="ado-card-body">
          <div className="ado-card-label">{c.label}</div>
          <div className="ado-card-meta">
           <span>{c.metaPrimary}</span>
           <span className="ado-card-dot">·</span>
           <span>{c.metaSecondary}</span>
          </div>
         </div>
        </div>
       );
      })}
     </div>

     {data.moderation && (
      <section className="ado-section">
       <header className="ado-section-head">
        <h3 className="ado-section-title">
         <ShieldAlert className="w-4 h-4" />
         Moderasyon Detayı
        </h3>
        <p className="ado-section-sub">Aktif kuyruktaki moderasyon işlemleri</p>
       </header>
       <div className="ado-mod-grid">
        <div className="ado-mod-item ado-mod-item--warn">
         <Clock className="w-4 h-4 ado-mod-icon" />
         <div className="ado-mod-val">{data.moderation.queue.pending}</div>
         <div className="ado-mod-lbl">Beklemede</div>
        </div>
        <div className="ado-mod-item">
         <Eye className="w-4 h-4 ado-mod-icon" />
         <div className="ado-mod-val">{data.moderation.queue.inReview}</div>
         <div className="ado-mod-lbl">İncelemede</div>
        </div>
        <div className="ado-mod-item ado-mod-item--danger">
         <AlertTriangle className="w-4 h-4 ado-mod-icon" />
         <div className="ado-mod-val">{data.moderation.flags.highSeverity}</div>
         <div className="ado-mod-lbl">Yüksek Önem</div>
        </div>
        <div className="ado-mod-item ado-mod-item--accent">
         <TrendingUp className="w-4 h-4 ado-mod-icon" />
         <div className="ado-mod-val">{data.moderation.actions.suspensions}</div>
         <div className="ado-mod-lbl">Toplam Suspansyon</div>
        </div>
       </div>
      </section>
     )}
    </>
   )}

   <style>{`
    .ado-page { display: flex; flex-direction: column; gap: 1.25rem; }
    .ado-toolbar {
     display: flex; align-items: center; justify-content: space-between;
     gap: 1rem; flex-wrap: wrap;
    }
    .ado-period-group {
     display: inline-flex; gap: 0.3rem;
     padding: 0.3rem;
     background: var(--adm-bg-elev);
     border: 1px solid var(--adm-border);
     border-radius: 10px;
    }
    .ado-period {
     padding: 0.45rem 0.95rem;
     font-size: 0.82rem; font-weight: 600;
     color: var(--adm-text-muted);
     background: transparent;
     border: none;
     border-radius: 7px;
     cursor: pointer;
     transition: all 0.15s;
    }
    .ado-period:hover { background: var(--adm-bg-hover); color: var(--adm-text); }
    .ado-period--active {
     background: linear-gradient(135deg, var(--adm-accent), var(--adm-warning));
     color: #fff !important;
     box-shadow: 0 2px 8px -2px rgba(192,87,31,0.3);
    }
    .ado-period-hint {
     display: inline-flex; align-items: center; gap: 0.3rem;
     font-size: 0.78rem;
     color: var(--adm-text-soft);
    }
    .ado-error {
     display: flex; gap: 0.75rem;
     padding: 0.85rem 1rem;
     background: rgba(225,29,72,0.08);
     border: 1px solid rgba(225,29,72,0.25);
     border-radius: 10px;
     color: rgb(190,18,60);
    }
    .ado-error strong { display: block; font-weight: 700; margin-bottom: 0.2rem; }
    .ado-error p { margin: 0; font-size: 0.86rem; opacity: 0.9; }

    .ado-grid {
     display: grid;
     grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
     gap: 1rem;
    }
    .ado-skel-card {
     height: 130px;
     background: var(--adm-bg-elev);
     border: 1px solid var(--adm-border);
     border-radius: 12px;
     position: relative;
     overflow: hidden;
    }
    .ado-skel-card::after {
     content: '';
     position: absolute; inset: 0;
     background: linear-gradient(90deg, transparent, var(--adm-bg-hover), transparent);
     animation: adoShimmer 1.4s infinite;
    }
    @keyframes adoShimmer {
     from { transform: translateX(-100%); }
     to { transform: translateX(100%); }
    }

    .ado-card {
     background: var(--adm-bg-elev);
     border: 1px solid var(--adm-border);
     border-radius: 12px;
     padding: 1.15rem 1.25rem;
     position: relative;
     overflow: hidden;
     transition: transform 0.15s, border-color 0.15s;
    }
    .ado-card::before {
     content: '';
     position: absolute; inset: 0;
     background: radial-gradient(circle at 100% 0%, var(--ado-c-fg) 0%, transparent 55%);
     opacity: 0.06;
     pointer-events: none;
    }
    .ado-card:hover {
     transform: translateY(-2px);
     border-color: var(--ado-c-fg);
    }
    .ado-card-row {
     display: flex; align-items: center; justify-content: space-between;
     position: relative;
    }
    .ado-card-icon {
     width: 38px; height: 38px;
     border-radius: 10px;
     background: var(--ado-c-bg);
     color: var(--ado-c-fg);
     display: inline-flex; align-items: center; justify-content: center;
     flex-shrink: 0;
    }
    .ado-card-val {
     font-family: 'Cormorant Garamond', serif;
     font-size: 1.9rem; font-weight: 700;
     color: var(--adm-text);
     line-height: 1;
     letter-spacing: -0.02em;
    }
    .ado-card-body { position: relative; margin-top: 0.75rem; }
    .ado-card-label {
     font-size: 0.86rem; font-weight: 600;
     color: var(--adm-text);
    }
    .ado-card-meta {
     display: flex; align-items: center; gap: 0.4rem;
     margin-top: 0.3rem;
     font-size: 0.74rem;
     color: var(--adm-text-soft);
    }
    .ado-card-dot { opacity: 0.5; }

    .ado-section {
     background: var(--adm-bg-elev);
     border: 1px solid var(--adm-border);
     border-radius: 12px;
     overflow: hidden;
    }
    .ado-section-head {
     padding: 0.95rem 1.15rem;
     border-bottom: 1px solid var(--adm-border);
     background: var(--adm-bg-hover);
    }
    .ado-section-title {
     display: inline-flex; align-items: center; gap: 0.5rem;
     margin: 0;
     font-size: 0.95rem; font-weight: 600;
     color: var(--adm-text);
    }
    .ado-section-sub {
     margin: 0.2rem 0 0;
     font-size: 0.78rem;
     color: var(--adm-text-soft);
    }
    .ado-mod-grid {
     display: grid;
     grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
     gap: 0.75rem;
     padding: 1rem;
    }
    .ado-mod-item {
     padding: 0.85rem;
     background: var(--adm-bg);
     border: 1px solid var(--adm-border);
     border-radius: 10px;
     position: relative;
    }
    .ado-mod-icon {
     color: var(--adm-text-soft);
     margin-bottom: 0.4rem;
    }
    .ado-mod-val {
     font-family: 'Cormorant Garamond', serif;
     font-size: 1.6rem; font-weight: 700;
     color: var(--adm-text);
     line-height: 1;
    }
    .ado-mod-lbl {
     margin-top: 0.25rem;
     font-size: 0.74rem;
     color: var(--adm-text-soft);
    }
    .ado-mod-item--warn { border-color: rgba(217,119,6,0.25); }
    .ado-mod-item--warn .ado-mod-icon { color: rgb(180,83,9); }
    .ado-mod-item--warn .ado-mod-val { color: rgb(180,83,9); }
    .ado-mod-item--danger { border-color: rgba(225,29,72,0.25); }
    .ado-mod-item--danger .ado-mod-icon { color: rgb(190,18,60); }
    .ado-mod-item--danger .ado-mod-val { color: rgb(190,18,60); }
    .ado-mod-item--accent { border-color: rgba(184,115,51,0.3); }
    .ado-mod-item--accent .ado-mod-icon { color: var(--adm-accent); }
    .ado-mod-item--accent .ado-mod-val { color: var(--adm-accent); }
   `}</style>
  </div>
 );
}
