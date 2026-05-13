/**
 * Admin Performance Dashboard — enterprise redesign 2026.
 */
import { useState, useEffect } from 'react';
import { Gauge, Clock, Zap, Database, AlertTriangle, BarChart3, Wifi, Lightbulb, RefreshCw } from 'lucide-react';

interface PerformanceStats {
 avg_lcp?: number;
 avg_ttfb?: number;
 avg_fcp?: number;
 lcp_fails?: number;
}
interface PerformancePage { url: string; samples: number; avg_lcp: number; lcp_violations: number; }
interface ConnectionType { effective_type: string; count: number; avg_lcp: number; }
interface DatabaseStatus { activeConnections: number; cacheHitRatio: string | number; }
interface Recommendation { title: string; description: string; category: string; estimatedImpact: string; }
interface PerformanceData {
 performance: {
  stats: PerformanceStats;
  pages: PerformancePage[];
  connectionTypes: ConnectionType[];
  database: DatabaseStatus;
 };
 recommendations: Recommendation[];
 lastUpdated: string;
}

const TABS = [
 { id: 'summary', label: 'Özet', icon: Gauge },
 { id: 'pages', label: 'Sayfalar', icon: BarChart3 },
 { id: 'connections', label: 'Bağlantılar', icon: Wifi },
 { id: 'recommendations', label: 'Öneriler', icon: Lightbulb },
] as const;

type TabId = typeof TABS[number]['id'];

function unwrapData(raw: any): PerformanceData | null {
 if (raw?.data?.performance) return raw.data;
 if (raw?.data?.data?.performance) return raw.data.data;
 if (raw?.performance) return raw;
 return null;
}

export default function AdminPerformanceDashboard() {
 const [data, setData] = useState<PerformanceData | null>(null);
 const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
 const [loading, setLoading] = useState(true);
 const [activeTab, setActiveTab] = useState<TabId>('summary');

 const fetchData = async () => {
  try {
   const [summaryRes, recsRes] = await Promise.all([
    fetch('/api/admin/performance/summary'),
    fetch('/api/admin/performance/recommendations'),
   ]);
   if (summaryRes.ok) {
    const raw = await summaryRes.json();
    const payload = unwrapData(raw);
    if (payload) setData(payload);
   }
   if (recsRes.ok) {
    const raw = await recsRes.json();
    const recs = raw?.data?.data?.recommendations || raw?.data?.recommendations || raw?.recommendations || [];
    setRecommendations(Array.isArray(recs) ? recs : []);
   }
  } catch (error) {
   console.error('Performans verisi alınamadı:', error);
  } finally {
   setLoading(false);
  }
 };

 useEffect(() => {
  fetchData();
  const interval = setInterval(fetchData, 60000);
  return () => clearInterval(interval);
 }, []);

 const stats = data?.performance.stats || {};
 const avgLcp = stats.avg_lcp ? Math.round(stats.avg_lcp) : 0;
 const avgTtfb = stats.avg_ttfb ? Math.round(stats.avg_ttfb) : 0;
 const avgFcp = stats.avg_fcp ? Math.round(stats.avg_fcp) : 0;
 const lcpFails = stats.lcp_fails ?? 0;

 const ratingFor = (value: number, good: number, poor: number): { tone: 'ok' | 'warn' | 'bad'; label: string } => {
  if (value === 0) return { tone: 'ok', label: 'Veri yok' };
  if (value <= good) return { tone: 'ok', label: 'İyi' };
  if (value <= poor) return { tone: 'warn', label: 'İyileştirilmeli' };
  return { tone: 'bad', label: 'Zayıf' };
 };

 const lcpR = ratingFor(avgLcp, 2500, 4000);
 const ttfbR = ratingFor(avgTtfb, 600, 1200);
 const fcpR = ratingFor(avgFcp, 1800, 3000);

 return (
  <div className="apd-page">
   <div className="apd-tabs" role="tablist">
    {TABS.map((tab) => {
     const Icon = tab.icon;
     return (
      <button
       key={tab.id}
       onClick={() => setActiveTab(tab.id)}
       className={`apd-tab ${activeTab === tab.id ? 'apd-tab--active' : ''}`}
       type="button"
       role="tab"
      >
       <Icon className="w-4 h-4" />
       <span>{tab.label}</span>
      </button>
     );
    })}
   </div>

   {loading && !data && (
    <div className="apd-grid">
     {[1,2,3].map(i => <div key={i} className="apd-skel" />)}
    </div>
   )}

   {!loading && !data && (
    <div className="apd-error">Performans verileri yüklenemedi</div>
   )}

   {data && activeTab === 'summary' && (
    <div className="apd-summary">
     <div className="apd-grid">
      <div className={`apd-metric apd-metric--${lcpR.tone}`}>
       <Clock className="apd-metric-icon w-5 h-5" />
       <div className="apd-metric-body">
        <p className="apd-metric-label">LCP <span className="apd-metric-sub">(Largest Contentful Paint)</span></p>
        <p className="apd-metric-val">{avgLcp}<span>ms</span></p>
        <p className="apd-metric-target">Hedef: &lt;2500ms · <strong>{lcpR.label}</strong></p>
       </div>
      </div>

      <div className={`apd-metric apd-metric--${ttfbR.tone}`}>
       <Zap className="apd-metric-icon w-5 h-5" />
       <div className="apd-metric-body">
        <p className="apd-metric-label">TTFB <span className="apd-metric-sub">(Time to First Byte)</span></p>
        <p className="apd-metric-val">{avgTtfb}<span>ms</span></p>
        <p className="apd-metric-target">Hedef: &lt;600ms · <strong>{ttfbR.label}</strong></p>
       </div>
      </div>

      <div className={`apd-metric apd-metric--${fcpR.tone}`}>
       <Gauge className="apd-metric-icon w-5 h-5" />
       <div className="apd-metric-body">
        <p className="apd-metric-label">FCP <span className="apd-metric-sub">(First Contentful Paint)</span></p>
        <p className="apd-metric-val">{avgFcp}<span>ms</span></p>
        <p className="apd-metric-target">Hedef: &lt;1800ms · <strong>{fcpR.label}</strong></p>
       </div>
      </div>
     </div>

     <div className="apd-detail-row">
      <section className="apd-section">
       <header className="apd-section-head">
        <h3 className="apd-section-title"><Database className="w-4 h-4" /> Veritabanı Durumu</h3>
       </header>
       <dl className="apd-stats">
        <div><dt>Aktif Bağlantılar</dt><dd>{data.performance.database?.activeConnections ?? 0}</dd></div>
        <div><dt>Önbellek İsabet Oranı</dt><dd>{data.performance.database?.cacheHitRatio ?? 'N/A'}</dd></div>
       </dl>
      </section>
      <section className="apd-section">
       <header className="apd-section-head">
        <h3 className="apd-section-title"><AlertTriangle className="w-4 h-4" /> İhlaller (Son 24s)</h3>
       </header>
       <dl className="apd-stats">
        <div>
         <dt>LCP İhlalleri</dt>
         <dd className={lcpFails > 0 ? 'apd-stat-bad' : 'apd-stat-ok'}>{lcpFails}</dd>
        </div>
       </dl>
      </section>
     </div>
    </div>
   )}

   {data && activeTab === 'pages' && (
    <div className="apd-table-wrap">
     <table className="apd-table">
      <thead>
       <tr>
        <th>Sayfa</th>
        <th className="apd-th-num">Örnek</th>
        <th className="apd-th-num">Ort. LCP</th>
        <th className="apd-th-num">İhlal</th>
       </tr>
      </thead>
      <tbody>
       {data.performance.pages.map((page, idx) => {
        const lcpBad = page.avg_lcp > 2500;
        return (
         <tr key={idx}>
          <td className="apd-td-url" title={page.url}>{page.url}</td>
          <td className="apd-td-num">{page.samples.toLocaleString('tr-TR')}</td>
          <td className={`apd-td-num apd-td-${lcpBad ? 'bad' : 'ok'}`}>{Math.round(page.avg_lcp)}ms</td>
          <td className={`apd-td-num apd-td-${page.lcp_violations > 0 ? 'bad' : 'ok'}`}>{page.lcp_violations}</td>
         </tr>
        );
       })}
       {data.performance.pages.length === 0 && (
        <tr><td colSpan={4} className="apd-empty">Sayfa verisi yok</td></tr>
       )}
      </tbody>
     </table>
    </div>
   )}

   {data && activeTab === 'connections' && (
    <div className="apd-table-wrap">
     <table className="apd-table">
      <thead>
       <tr>
        <th>Bağlantı Türü</th>
        <th className="apd-th-num">Oturum</th>
        <th className="apd-th-num">Ort. LCP</th>
       </tr>
      </thead>
      <tbody>
       {(data.performance.connectionTypes || []).map((c, idx) => {
        const bad = c.avg_lcp > 2500;
        return (
         <tr key={idx}>
          <td>{c.effective_type || 'Bilinmiyor'}</td>
          <td className="apd-td-num">{(c.count || 0).toLocaleString('tr-TR')}</td>
          <td className={`apd-td-num apd-td-${bad ? 'bad' : 'ok'}`}>{Math.round(c.avg_lcp || 0)}ms</td>
         </tr>
        );
       })}
       {(data.performance.connectionTypes || []).length === 0 && (
        <tr><td colSpan={3} className="apd-empty">Bağlantı türü verisi yok</td></tr>
       )}
      </tbody>
     </table>
    </div>
   )}

   {data && activeTab === 'recommendations' && (
    <div className="apd-recs">
     {recommendations.map((rec, idx) => (
      <article key={idx} className="apd-rec">
       <div className="apd-rec-icon" aria-hidden="true"><Lightbulb className="w-4 h-4" /></div>
       <div className="apd-rec-body">
        <h4 className="apd-rec-title">{rec.title}</h4>
        <p className="apd-rec-desc">{rec.description}</p>
        <div className="apd-rec-meta">
         <span className="apd-rec-tag">{rec.category}</span>
         <span className="apd-rec-impact">Etki: <strong>{rec.estimatedImpact}</strong></span>
        </div>
       </div>
      </article>
     ))}
     {recommendations.length === 0 && (
      <p className="apd-empty-state">Performans önerisi yok — sistem optimal görünüyor ✓</p>
     )}
    </div>
   )}

   {data && (
    <div className="apd-foot">
     <RefreshCw className="w-3 h-3" />
     <span>Son güncelleme: {new Date(data.lastUpdated).toLocaleString('tr-TR')} (60sn'de bir otomatik)</span>
    </div>
   )}

   <style>{`
    .apd-page { display: flex; flex-direction: column; gap: 1rem; }

    .apd-tabs {
     display: flex; gap: 0.3rem;
     padding: 0.3rem;
     background: var(--adm-bg-elev);
     border: 1px solid var(--adm-border);
     border-radius: 10px;
     width: fit-content;
     max-width: 100%;
     overflow-x: auto;
    }
    .apd-tab {
     display: inline-flex; align-items: center; gap: 0.4rem;
     padding: 0.5rem 0.9rem;
     background: transparent;
     border: none;
     border-radius: 7px;
     font-size: 0.82rem; font-weight: 600;
     color: var(--adm-text-muted);
     cursor: pointer;
     white-space: nowrap;
     transition: all 0.15s;
    }
    .apd-tab:hover { background: var(--adm-bg-hover); color: var(--adm-text); }
    .apd-tab--active {
     background: linear-gradient(135deg, var(--adm-accent), var(--adm-warning));
     color: #fff !important;
    }

    .apd-grid {
     display: grid;
     grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
     gap: 1rem;
    }
    .apd-skel {
     height: 130px;
     background: var(--adm-bg-elev);
     border: 1px solid var(--adm-border);
     border-radius: 12px;
     position: relative;
     overflow: hidden;
    }
    .apd-skel::after {
     content: '';
     position: absolute; inset: 0;
     background: linear-gradient(90deg, transparent, var(--adm-bg-hover), transparent);
     animation: apdShimmer 1.4s infinite;
    }
    @keyframes apdShimmer {
     from { transform: translateX(-100%); }
     to { transform: translateX(100%); }
    }

    .apd-error {
     padding: 1rem;
     background: rgba(225,29,72,0.08);
     border: 1px solid rgba(225,29,72,0.25);
     border-radius: 10px;
     color: rgb(190,18,60);
     text-align: center;
    }

    .apd-summary { display: flex; flex-direction: column; gap: 1.25rem; }
    .apd-metric {
     display: flex; gap: 0.85rem;
     padding: 1.15rem 1.25rem;
     background: var(--adm-bg-elev);
     border: 1px solid var(--adm-border);
     border-radius: 12px;
     position: relative;
     overflow: hidden;
    }
    .apd-metric::before {
     content: '';
     position: absolute; inset: 0;
     background: radial-gradient(circle at 100% 0%, var(--apd-c) 0%, transparent 55%);
     opacity: 0.06;
     pointer-events: none;
    }
    .apd-metric--ok { --apd-c: rgb(16,185,129); }
    .apd-metric--warn { --apd-c: rgb(217,119,6); }
    .apd-metric--bad { --apd-c: rgb(225,29,72); }
    .apd-metric-icon {
     padding: 9px;
     border-radius: 10px;
     flex-shrink: 0;
     width: 38px !important; height: 38px !important;
     background: color-mix(in srgb, var(--apd-c) 12%, transparent);
     color: var(--apd-c);
     box-sizing: border-box;
    }
    .apd-metric-body { position: relative; flex: 1; min-width: 0; }
    .apd-metric-label {
     font-size: 0.82rem; font-weight: 600;
     color: var(--adm-text);
     margin: 0;
    }
    .apd-metric-sub {
     font-size: 0.7rem;
     color: var(--adm-text-soft);
     font-weight: 500;
    }
    .apd-metric-val {
     font-family: 'Cormorant Garamond', serif;
     font-size: 2.2rem; font-weight: 700;
     color: var(--adm-text);
     margin: 0.3rem 0 0;
     line-height: 1;
     letter-spacing: -0.02em;
    }
    .apd-metric-val span {
     font-size: 1.1rem;
     color: var(--adm-text-soft);
     font-weight: 500;
     margin-left: 0.15rem;
    }
    .apd-metric-target {
     margin: 0.4rem 0 0;
     font-size: 0.72rem;
     color: var(--adm-text-soft);
    }
    .apd-metric-target strong { color: var(--apd-c); font-weight: 700; }

    .apd-detail-row {
     display: grid;
     grid-template-columns: 1fr;
     gap: 1rem;
    }
    @media (min-width: 720px) {
     .apd-detail-row { grid-template-columns: 1fr 1fr; }
    }
    .apd-section {
     background: var(--adm-bg-elev);
     border: 1px solid var(--adm-border);
     border-radius: 12px;
     overflow: hidden;
    }
    .apd-section-head {
     padding: 0.85rem 1.15rem;
     background: var(--adm-bg-hover);
     border-bottom: 1px solid var(--adm-border);
    }
    .apd-section-title {
     display: inline-flex; align-items: center; gap: 0.45rem;
     margin: 0;
     font-size: 0.92rem; font-weight: 600;
     color: var(--adm-text);
    }
    .apd-stats {
     padding: 0.85rem 1.15rem;
     margin: 0;
     display: flex; flex-direction: column; gap: 0.55rem;
    }
    .apd-stats > div {
     display: flex; justify-content: space-between;
     padding: 0.45rem 0.65rem;
     background: var(--adm-bg);
     border-radius: 6px;
    }
    .apd-stats dt { color: var(--adm-text-soft); margin: 0; font-size: 0.85rem; }
    .apd-stats dd {
     margin: 0;
     font-weight: 700;
     color: var(--adm-text);
     font-family: 'Menlo', 'Monaco', monospace;
     font-size: 0.86rem;
    }
    .apd-stat-ok { color: rgb(5,150,105) !important; }
    .apd-stat-bad { color: rgb(190,18,60) !important; }

    .apd-table-wrap {
     overflow-x: auto;
     background: var(--adm-bg-elev);
     border: 1px solid var(--adm-border);
     border-radius: 12px;
    }
    .apd-table { width: 100%; border-collapse: collapse; }
    .apd-table th {
     text-align: left;
     font-size: 0.7rem;
     font-weight: 700;
     letter-spacing: 0.06em;
     text-transform: uppercase;
     color: var(--adm-text-soft);
     padding: 0.7rem 1rem;
     background: var(--adm-bg-hover);
     border-bottom: 1px solid var(--adm-border);
    }
    .apd-th-num { text-align: right; }
    .apd-table tbody tr {
     border-bottom: 1px solid var(--adm-border);
    }
    .apd-table tbody tr:last-child { border-bottom: none; }
    .apd-table tbody tr:hover { background: var(--adm-bg-hover); }
    .apd-table td { padding: 0.7rem 1rem; font-size: 0.84rem; color: var(--adm-text); }
    .apd-td-num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
    .apd-td-url {
     max-width: 380px;
     overflow: hidden;
     text-overflow: ellipsis;
     white-space: nowrap;
     font-family: 'Menlo', 'Monaco', monospace;
     font-size: 0.78rem;
     color: var(--adm-text-muted);
    }
    .apd-td-ok { color: rgb(5,150,105); }
    .apd-td-bad { color: rgb(190,18,60); }
    .apd-empty {
     text-align: center !important;
     padding: 2rem 1rem !important;
     color: var(--adm-text-soft) !important;
     font-style: italic;
    }

    .apd-recs { display: flex; flex-direction: column; gap: 0.65rem; }
    .apd-rec {
     display: flex; gap: 0.85rem;
     padding: 0.95rem 1.1rem;
     background: var(--adm-bg-elev);
     border: 1px solid var(--adm-border);
     border-left: 3px solid var(--adm-accent);
     border-radius: 10px;
    }
    .apd-rec-icon {
     width: 32px; height: 32px;
     background: rgba(217,119,6,0.12);
     color: rgb(180,83,9);
     border-radius: 8px;
     display: inline-flex; align-items: center; justify-content: center;
     flex-shrink: 0;
    }
    .apd-rec-body { flex: 1; min-width: 0; }
    .apd-rec-title { font-weight: 700; color: var(--adm-text); margin: 0 0 0.25rem; font-size: 0.92rem; }
    .apd-rec-desc { font-size: 0.84rem; color: var(--adm-text-muted); margin: 0; line-height: 1.5; }
    .apd-rec-meta {
     display: flex; gap: 0.6rem; align-items: center;
     margin-top: 0.55rem;
     font-size: 0.74rem;
    }
    .apd-rec-tag {
     padding: 0.15rem 0.55rem;
     background: var(--adm-accent-soft);
     color: var(--adm-accent);
     border-radius: 999px;
     font-weight: 600;
    }
    .apd-rec-impact { color: var(--adm-text-soft); }
    .apd-rec-impact strong { color: var(--adm-text); }

    .apd-empty-state {
     padding: 2rem 1rem;
     text-align: center;
     color: var(--adm-text-soft);
     font-size: 0.88rem;
     margin: 0;
    }

    .apd-foot {
     display: inline-flex; align-items: center; gap: 0.3rem;
     font-size: 0.72rem;
     color: var(--adm-text-soft);
    }
   `}</style>
  </div>
 );
}
