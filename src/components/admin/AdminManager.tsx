/**
 * AdminManager — hub component for /admin/manage
 *
 * Önceden 3-tab placeholder demo data içeren bir component'ti.
 * Şimdi: dedicated dedicated sayfalara hızlı erişim hub'ı.
 *
 * Gerçek işlevsellik için:
 *   /admin/places   — işletme yönetimi (tam DataTable, filter, bulk)
 *   /admin/users    — kullanıcı yönetimi (rol/status, bulk işlem)
 *   /admin/reviews  — yorum moderasyon
 */
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

interface HubStats {
 places: number;
 placesPending: number;
 users: number;
 usersPending: number;
 reviews: number;
 reviewsPending: number;
}

const RESOURCES = [
 {
  id: 'places',
  title: 'İşletme Yönetimi',
  desc: 'Mekanları listele, onayla, askıya al, öne çıkar',
  href: '/admin/places',
  icon: '🏪',
  bg: 'rgba(99,102,241,0.12)',
  fg: 'rgb(99,102,241)',
 },
 {
  id: 'users',
  title: 'Kullanıcı Yönetimi',
  desc: 'Üyeleri görüntüle, rol değiştir, banla',
  href: '/admin/users',
  icon: '👥',
  bg: 'rgba(16,185,129,0.12)',
  fg: 'rgb(5,150,105)',
 },
 {
  id: 'reviews',
  title: 'Yorum Moderasyonu',
  desc: 'Bekleyen yorumları onayla veya reddet',
  href: '/admin/reviews',
  icon: '⭐',
  bg: 'rgba(217,119,6,0.12)',
  fg: 'rgb(180,83,9)',
 },
] as const;

export default function AdminManager() {
 const [stats, setStats] = useState<HubStats | null>(null);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
  fetch('/api/admin/stats')
   .then(r => r.json())
   .then(raw => {
    const data = raw?.data?.data || raw?.data || raw || {};
    setStats({
     places: Number(data.totalPlaces || 0),
     placesPending: Number(data.pendingPlaces || 0),
     users: Number(data.totalUsers || 0),
     usersPending: Number(data.pendingUsers || 0),
     reviews: Number(data.totalReviews || 0),
     reviewsPending: Number(data.pendingReviews || 0),
    });
   })
   .catch(e => setError(e instanceof Error ? e.message : 'Yüklenemedi'));
 }, []);

 const statFor = (id: string): { total: number; pending: number } | null => {
  if (!stats) return null;
  if (id === 'places') return { total: stats.places, pending: stats.placesPending };
  if (id === 'users') return { total: stats.users, pending: stats.usersPending };
  if (id === 'reviews') return { total: stats.reviews, pending: stats.reviewsPending };
  return null;
 };

 return (
  <div className="mg-hub">
   <header className="mg-head">
    <h2 className="mg-head-title">Hızlı Yönetim Erişimi</h2>
    <p className="mg-head-sub">Üç temel yönetim modülü — kart üzerine tıklayarak dedicated sayfaya gidin</p>
   </header>

   {error && (
    <div className="mg-error">İstatistik yüklenemedi: {error}</div>
   )}

   <div className="mg-grid">
    {RESOURCES.map((r) => {
     const s = statFor(r.id);
     return (
      <a
       key={r.id}
       href={r.href}
       className="mg-card"
       style={{ ['--mg-c-bg' as string]: r.bg, ['--mg-c-fg' as string]: r.fg }}
      >
       <div className="mg-card-row">
        <div className="mg-card-icon" aria-hidden="true">{r.icon}</div>
        {s ? (
         <div className="mg-card-num">
          <strong>{s.total.toLocaleString('tr-TR')}</strong>
          {s.pending > 0 && (
           <span className="mg-card-pending">{s.pending} bekliyor</span>
          )}
         </div>
        ) : (
         <span className="mg-card-skel" aria-hidden="true" />
        )}
       </div>
       <div className="mg-card-body">
        <h3 className="mg-card-title">{r.title}</h3>
        <p className="mg-card-desc">{r.desc}</p>
       </div>
       <div className="mg-card-cta">
        <span>Aç</span>
        <ArrowRight size={14} aria-hidden="true" />
       </div>
      </a>
     );
    })}
   </div>

   <style>{`
    .mg-hub { display: flex; flex-direction: column; gap: 1.25rem; }
    .mg-head {}
    .mg-head-title {
     font-family: 'Cormorant Garamond', serif;
     font-size: 1.5rem; font-weight: 700;
     color: var(--adm-text);
     margin: 0 0 0.35rem;
    }
    .mg-head-sub {
     font-size: 0.88rem;
     color: var(--adm-text-muted);
     margin: 0;
    }
    .mg-error {
     padding: 0.65rem 1rem;
     background: rgba(225,29,72,0.08);
     border: 1px solid rgba(225,29,72,0.2);
     border-radius: 8px;
     color: rgb(190,18,60);
     font-size: 0.86rem;
    }
    .mg-grid {
     display: grid;
     grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
     gap: 1rem;
    }
    .mg-card {
     display: flex; flex-direction: column;
     gap: 0.85rem;
     padding: 1.25rem;
     background: var(--adm-bg-elev);
     border: 1px solid var(--adm-border);
     border-radius: 12px;
     text-decoration: none;
     position: relative;
     overflow: hidden;
     transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
    }
    .mg-card::before {
     content: '';
     position: absolute; inset: 0;
     background: radial-gradient(circle at 100% 0%, var(--mg-c-fg) 0%, transparent 60%);
     opacity: 0.05;
     pointer-events: none;
    }
    .mg-card:hover {
     transform: translateY(-3px);
     border-color: var(--mg-c-fg);
     box-shadow: 0 10px 24px -6px rgba(31,20,16,0.12);
    }
    .mg-card-row {
     display: flex; align-items: center; justify-content: space-between;
     position: relative;
    }
    .mg-card-icon {
     width: 48px; height: 48px;
     border-radius: 12px;
     background: var(--mg-c-bg);
     color: var(--mg-c-fg);
     display: inline-flex; align-items: center; justify-content: center;
     font-size: 1.5rem;
    }
    .mg-card-num {
     text-align: right;
     display: flex; flex-direction: column;
    }
    .mg-card-num strong {
     font-family: 'Cormorant Garamond', serif;
     font-size: 2rem; font-weight: 700;
     color: var(--adm-text);
     line-height: 1;
     letter-spacing: -0.02em;
    }
    .mg-card-pending {
     font-size: 0.72rem;
     color: rgb(180,83,9);
     margin-top: 0.3rem;
     font-weight: 600;
    }
    .mg-card-skel {
     display: inline-block;
     width: 70px; height: 32px;
     background: var(--adm-bg-hover);
     border-radius: 6px;
    }
    .mg-card-body { position: relative; }
    .mg-card-title {
     font-size: 1.05rem; font-weight: 700;
     color: var(--adm-text);
     margin: 0 0 0.25rem;
    }
    .mg-card-desc {
     font-size: 0.82rem;
     color: var(--adm-text-muted);
     margin: 0;
     line-height: 1.5;
    }
    .mg-card-cta {
     display: inline-flex; align-items: center; gap: 0.3rem;
     padding: 0.45rem 0.85rem;
     background: var(--mg-c-bg);
     color: var(--mg-c-fg);
     border-radius: 999px;
     font-size: 0.8rem; font-weight: 600;
     align-self: flex-start;
     position: relative;
     transition: transform 0.18s, gap 0.18s;
    }
    .mg-card:hover .mg-card-cta { gap: 0.55rem; }
   `}</style>
  </div>
 );
}
