/**
 * Platform geneli yönetim analitik paneli — enterprise redesign 2026.
 */
import { useState, useEffect } from 'react';
import { Users, Eye, Activity, Calendar, TrendingUp, Search } from 'lucide-react';

interface DailyActiveUser { date: string; count: number; }
interface PlatformStats {
 uniqueUsers?: number;
 uniquePlacesViewed?: number;
 activities?: Record<string, number>;
 dailyActiveUsers?: DailyActiveUser[];
}
interface TrendingPlace {
 id: string | number;
 slug?: string;
 name: string;
 category?: string;
 image_url?: string;
 view_count?: number;
 unique_viewers?: number;
}
interface SearchTrend { query: string; count: number; unique_users: number; }
interface AnalyticsData {
 platformStats: PlatformStats;
 trendingPlaces: TrendingPlace[];
 searchTrends: SearchTrend[];
 period: number;
}
interface AnalyticsResponse {
 success?: boolean;
 data?: AnalyticsData;
 error?: string;
}

const PERIOD_OPTIONS = [
 { days: 7, label: '7 gün' },
 { days: 30, label: '30 gün' },
 { days: 90, label: '3 ay' },
 { days: 365, label: '1 yıl' },
];

const ACTIVITY_META: Record<string, { icon: string; label: string; color: string }> = {
 view:     { icon: '👁️', label: 'Görüntüleme', color: 'rgb(99,102,241)' },
 search:   { icon: '🔍', label: 'Arama',       color: 'rgb(2,132,199)' },
 review:   { icon: '⭐', label: 'İnceleme',    color: 'rgb(180,83,9)' },
 comment:  { icon: '💬', label: 'Yorum',       color: 'rgb(139,92,246)' },
 favorite: { icon: '❤️', label: 'Favori',      color: 'rgb(190,18,60)' },
};

export default function AdminAnalyticsDashboard() {
 const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState('');
 const [days, setDays] = useState(30);

 useEffect(() => {
  loadAnalytics();
 }, [days]);

 const loadAnalytics = async () => {
  try {
   setIsLoading(true);
   const response = await fetch(`/api/admin/analytics?days=${days}&limit=10`);
   const data = (await response.json()) as AnalyticsResponse;
   // Resilient unwrap — handle wrapped + double-wrapped
   const payload =
    (data as any)?.data?.platformStats ? data.data :
    (data as any)?.data?.data?.platformStats ? (data as any).data.data :
    null;
   if (payload) { setAnalytics(payload); setError(''); }
   else setError(data.error || 'Analitikler yüklenemedi');
  } catch (err) {
   console.error('Analitikler yüklenemedi:', err);
   setError('Analitikler yüklenirken bir hata oluştu');
  } finally {
   setIsLoading(false);
  }
 };

 const stats = analytics?.platformStats;
 const totalActivities = Object.values(stats?.activities || {}).reduce((a: number, b: unknown) => a + Number(b), 0);
 const avgDaily = Math.round((stats?.dailyActiveUsers?.reduce((sum, day) => sum + day.count, 0) || 0) / (stats?.dailyActiveUsers?.length || 1));

 const cards = stats ? [
  { icon: Users, label: 'Aktif Kullanıcı', value: stats.uniqueUsers || 0, color: 'indigo' as const },
  { icon: Eye, label: 'Görüntülenen Mekan', value: stats.uniquePlacesViewed || 0, color: 'emerald' as const },
  { icon: Activity, label: 'Toplam Aktivite', value: totalActivities, color: 'amber' as const },
  { icon: Calendar, label: 'Ort. Aktif/Gün', value: avgDaily, color: 'violet' as const },
 ] : [];

 const colorMap: Record<string, { bg: string; fg: string }> = {
  indigo: { bg: 'rgba(99,102,241,0.12)', fg: 'rgb(99,102,241)' },
  emerald: { bg: 'rgba(16,185,129,0.12)', fg: 'rgb(5,150,105)' },
  amber: { bg: 'rgba(217,119,6,0.12)', fg: 'rgb(180,83,9)' },
  violet: { bg: 'rgba(139,92,246,0.12)', fg: 'rgb(124,58,237)' },
 };

 return (
  <div className="aad-page">
   <div className="aad-toolbar">
    <div className="aad-period" role="group" aria-label="Dönem seçimi">
     {PERIOD_OPTIONS.map((opt) => (
      <button
       key={opt.days}
       onClick={() => setDays(opt.days)}
       className={`aad-period-btn ${days === opt.days ? 'aad-period-btn--active' : ''}`}
       type="button"
      >
       {opt.label}
      </button>
     ))}
    </div>
    {analytics && <span className="aad-period-hint">Son {days} gün</span>}
   </div>

   {error && (
    <div className="aad-error">{error}</div>
   )}

   {isLoading && !analytics && (
    <div className="aad-grid">
     {[1,2,3,4].map(i => <div key={i} className="aad-skel" />)}
    </div>
   )}

   {analytics && (
    <>
     <div className="aad-grid">
      {cards.map((c, idx) => {
       const cl = colorMap[c.color];
       const Icon = c.icon;
       return (
        <div
         key={idx}
         className="aad-card"
         style={{ ['--aad-c-bg' as string]: cl.bg, ['--aad-c-fg' as string]: cl.fg }}
        >
         <div className="aad-card-row">
          <div className="aad-card-icon" aria-hidden="true"><Icon className="w-5 h-5" /></div>
          <div className="aad-card-val">{c.value.toLocaleString('tr-TR')}</div>
         </div>
         <div className="aad-card-label">{c.label}</div>
        </div>
       );
      })}
     </div>

     <section className="aad-section">
      <header className="aad-section-head">
       <h3 className="aad-section-title">
        <Activity className="w-4 h-4" /> Aktivite Dağılımı
       </h3>
      </header>
      <div className="aad-activity-grid">
       {Object.entries(stats?.activities || {}).map(([type, count]) => {
        const meta = ACTIVITY_META[type] || { icon: '•', label: type, color: 'rgb(100,116,139)' };
        return (
         <div key={type} className="aad-activity-item">
          <span className="aad-activity-icon" style={{ color: meta.color }}>{meta.icon}</span>
          <div className="aad-activity-val">{Number(count).toLocaleString('tr-TR')}</div>
          <div className="aad-activity-lbl">{meta.label}</div>
         </div>
        );
       })}
       {Object.keys(stats?.activities || {}).length === 0 && (
        <p className="aad-empty">Bu dönemde aktivite kaydı yok</p>
       )}
      </div>
     </section>

     <section className="aad-section">
      <header className="aad-section-head">
       <h3 className="aad-section-title">
        <TrendingUp className="w-4 h-4" /> Trend Olan Mekanlar
       </h3>
      </header>
      <div className="aad-trending-grid">
       {analytics.trendingPlaces.map((place) => (
        <a
         key={place.id}
         href={place.slug ? `/isletme/${place.slug}` : '/mekanlar'}
         className="aad-trending-card"
        >
         {place.image_url ? (
          <div className="aad-trending-img-wrap">
           <img src={place.image_url} alt={place.name} loading="lazy" decoding="async" className="aad-trending-img" />
          </div>
         ) : (
          <div className="aad-trending-placeholder" aria-hidden="true">🏪</div>
         )}
         <div className="aad-trending-body">
          <h4 className="aad-trending-name">{place.name}</h4>
          {place.category && <p className="aad-trending-cat">{place.category}</p>}
          <div className="aad-trending-meta">
           <span><Eye className="w-3 h-3" /> {place.view_count || 0}</span>
           <span><Users className="w-3 h-3" /> {place.unique_viewers || 0}</span>
          </div>
         </div>
        </a>
       ))}
       {analytics.trendingPlaces.length === 0 && (
        <p className="aad-empty">Bu dönemde trend mekan yok</p>
       )}
      </div>
     </section>

     <section className="aad-section">
      <header className="aad-section-head">
       <h3 className="aad-section-title">
        <Search className="w-4 h-4" /> Popüler Aramalar
       </h3>
      </header>
      <ol className="aad-search-list">
       {analytics.searchTrends.slice(0, 10).map((trend, idx) => (
        <li key={idx} className="aad-search-item">
         <span className="aad-search-rank">#{idx + 1}</span>
         <span className="aad-search-query">{trend.query}</span>
         <span className="aad-search-meta">
          <strong>{trend.count.toLocaleString('tr-TR')}</strong> arama · {trend.unique_users} kişi
         </span>
        </li>
       ))}
       {analytics.searchTrends.length === 0 && (
        <p className="aad-empty">Henüz arama trendi yok</p>
       )}
      </ol>
     </section>
    </>
   )}

   <style>{`
    .aad-page { display: flex; flex-direction: column; gap: 1.25rem; }
    .aad-toolbar {
     display: flex; align-items: center; justify-content: space-between;
     gap: 1rem; flex-wrap: wrap;
    }
    .aad-period {
     display: inline-flex; gap: 0.3rem;
     padding: 0.3rem;
     background: var(--adm-bg-elev);
     border: 1px solid var(--adm-border);
     border-radius: 10px;
    }
    .aad-period-btn {
     padding: 0.45rem 0.95rem;
     font-size: 0.82rem; font-weight: 600;
     color: var(--adm-text-muted);
     background: transparent;
     border: none;
     border-radius: 7px;
     cursor: pointer;
     transition: all 0.15s;
    }
    .aad-period-btn:hover { background: var(--adm-bg-hover); color: var(--adm-text); }
    .aad-period-btn--active {
     background: linear-gradient(135deg, var(--adm-accent), var(--adm-warning));
     color: #fff !important;
     box-shadow: 0 2px 8px -2px rgba(192,87,31,0.3);
    }
    .aad-period-hint { font-size: 0.78rem; color: var(--adm-text-soft); }
    .aad-error {
     padding: 0.85rem 1rem;
     background: rgba(225,29,72,0.08);
     border: 1px solid rgba(225,29,72,0.25);
     border-radius: 10px;
     color: rgb(190,18,60);
     font-size: 0.86rem;
    }

    .aad-grid {
     display: grid;
     grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
     gap: 1rem;
    }
    .aad-skel {
     height: 110px;
     background: var(--adm-bg-elev);
     border: 1px solid var(--adm-border);
     border-radius: 12px;
     position: relative;
     overflow: hidden;
    }
    .aad-skel::after {
     content: '';
     position: absolute; inset: 0;
     background: linear-gradient(90deg, transparent, var(--adm-bg-hover), transparent);
     animation: aadShimmer 1.4s infinite;
    }
    @keyframes aadShimmer {
     from { transform: translateX(-100%); }
     to { transform: translateX(100%); }
    }

    .aad-card {
     background: var(--adm-bg-elev);
     border: 1px solid var(--adm-border);
     border-radius: 12px;
     padding: 1.1rem 1.25rem;
     position: relative;
     overflow: hidden;
     transition: transform 0.15s, border-color 0.15s;
    }
    .aad-card::before {
     content: '';
     position: absolute; inset: 0;
     background: radial-gradient(circle at 100% 0%, var(--aad-c-fg) 0%, transparent 55%);
     opacity: 0.06;
     pointer-events: none;
    }
    .aad-card:hover { transform: translateY(-2px); border-color: var(--aad-c-fg); }
    .aad-card-row {
     display: flex; align-items: center; justify-content: space-between;
     position: relative;
    }
    .aad-card-icon {
     width: 38px; height: 38px;
     border-radius: 10px;
     background: var(--aad-c-bg);
     color: var(--aad-c-fg);
     display: inline-flex; align-items: center; justify-content: center;
    }
    .aad-card-val {
     font-family: 'Cormorant Garamond', serif;
     font-size: 1.85rem; font-weight: 700;
     color: var(--adm-text);
     line-height: 1;
     letter-spacing: -0.02em;
    }
    .aad-card-label {
     margin-top: 0.65rem;
     font-size: 0.82rem; font-weight: 600;
     color: var(--adm-text-muted);
     position: relative;
    }

    .aad-section {
     background: var(--adm-bg-elev);
     border: 1px solid var(--adm-border);
     border-radius: 12px;
     overflow: hidden;
    }
    .aad-section-head {
     padding: 0.95rem 1.15rem;
     border-bottom: 1px solid var(--adm-border);
     background: var(--adm-bg-hover);
    }
    .aad-section-title {
     display: inline-flex; align-items: center; gap: 0.5rem;
     margin: 0;
     font-size: 0.95rem; font-weight: 600;
     color: var(--adm-text);
    }

    .aad-activity-grid {
     display: grid;
     grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
     gap: 0.75rem;
     padding: 1rem 1.15rem;
    }
    .aad-activity-item {
     padding: 0.85rem;
     background: var(--adm-bg);
     border: 1px solid var(--adm-border);
     border-radius: 10px;
     text-align: center;
    }
    .aad-activity-icon { font-size: 1.5rem; display: block; margin-bottom: 0.35rem; }
    .aad-activity-val {
     font-family: 'Cormorant Garamond', serif;
     font-size: 1.65rem; font-weight: 700;
     color: var(--adm-text);
     line-height: 1;
    }
    .aad-activity-lbl {
     margin-top: 0.25rem;
     font-size: 0.74rem;
     color: var(--adm-text-soft);
     font-weight: 500;
    }

    .aad-trending-grid {
     display: grid;
     grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
     gap: 0.85rem;
     padding: 1rem 1.15rem;
    }
    .aad-trending-card {
     display: flex; flex-direction: column;
     background: var(--adm-bg);
     border: 1px solid var(--adm-border);
     border-radius: 10px;
     overflow: hidden;
     text-decoration: none;
     transition: transform 0.18s, border-color 0.18s;
    }
    .aad-trending-card:hover {
     transform: translateY(-2px);
     border-color: var(--adm-accent);
    }
    .aad-trending-img-wrap {
     aspect-ratio: 16 / 10;
     overflow: hidden;
     background: var(--adm-bg-hover);
    }
    .aad-trending-img {
     width: 100%; height: 100%;
     object-fit: cover;
     transition: transform 0.3s;
    }
    .aad-trending-card:hover .aad-trending-img { transform: scale(1.05); }
    .aad-trending-placeholder {
     aspect-ratio: 16 / 10;
     display: flex; align-items: center; justify-content: center;
     background: var(--adm-bg-hover);
     font-size: 1.8rem;
    }
    .aad-trending-body { padding: 0.65rem 0.85rem 0.85rem; }
    .aad-trending-name {
     font-size: 0.85rem;
     font-weight: 600;
     color: var(--adm-text);
     margin: 0 0 0.2rem;
     display: -webkit-box;
     -webkit-line-clamp: 2;
     -webkit-box-orient: vertical;
     overflow: hidden;
     line-height: 1.3;
    }
    .aad-trending-cat {
     font-size: 0.7rem;
     color: var(--adm-text-soft);
     margin: 0 0 0.4rem;
    }
    .aad-trending-meta {
     display: flex; gap: 0.6rem;
     font-size: 0.74rem;
     color: var(--adm-text-muted);
    }
    .aad-trending-meta span {
     display: inline-flex; align-items: center; gap: 0.25rem;
    }

    .aad-search-list {
     padding: 0.5rem;
     margin: 0;
     list-style: none;
     display: flex; flex-direction: column; gap: 0.35rem;
    }
    .aad-search-item {
     display: grid;
     grid-template-columns: auto 1fr auto;
     gap: 0.85rem;
     align-items: center;
     padding: 0.65rem 0.85rem;
     background: var(--adm-bg);
     border: 1px solid var(--adm-border);
     border-radius: 8px;
    }
    .aad-search-rank {
     font-family: 'Cormorant Garamond', serif;
     font-size: 1rem; font-weight: 700;
     color: var(--adm-accent);
     min-width: 28px;
    }
    .aad-search-query {
     font-weight: 600;
     color: var(--adm-text);
     overflow: hidden;
     text-overflow: ellipsis;
     white-space: nowrap;
    }
    .aad-search-meta {
     font-size: 0.78rem;
     color: var(--adm-text-soft);
    }
    .aad-search-meta strong { color: var(--adm-text); font-weight: 700; }

    .aad-empty {
     text-align: center;
     padding: 2rem 1rem;
     color: var(--adm-text-soft);
     font-size: 0.86rem;
     font-style: italic;
     margin: 0;
     grid-column: 1 / -1;
    }
   `}</style>
  </div>
 );
}
