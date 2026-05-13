/**
 * Admin Loyalty Panel — sadakat ödülleri yönetim paneli.
 * Enterprise redesign 2026.
 */
import { useState, useEffect } from 'react';
import { Gift, Award, Tag, Trophy, Sparkles } from 'lucide-react';

interface Reward {
 id: string;
 reward_name: string;
 category: string;
 points_cost: number;
}

const CATEGORY_META: Record<string, { icon: string; color: string; bg: string }> = {
 indirim: { icon: '🎟️', color: 'rgb(180,83,9)', bg: 'rgba(217,119,6,0.12)' },
 hediye: { icon: '🎁', color: 'rgb(190,18,60)', bg: 'rgba(225,29,72,0.12)' },
 deneyim: { icon: '✨', color: 'rgb(124,58,237)', bg: 'rgba(139,92,246,0.12)' },
 yemek: { icon: '🍴', color: 'rgb(5,150,105)', bg: 'rgba(16,185,129,0.12)' },
 ozel: { icon: '🌟', color: 'rgb(2,132,199)', bg: 'rgba(2,132,199,0.12)' },
};

function categoryBadge(category: string): { icon: string; color: string; bg: string } {
 const key = (category || '').toLowerCase();
 for (const [k, v] of Object.entries(CATEGORY_META)) {
  if (key.includes(k)) return v;
 }
 return { icon: '🏷️', color: 'rgb(71,85,105)', bg: 'rgba(100,116,139,0.12)' };
}

export default function AdminLoyaltyPanel() {
 const [rewards, setRewards] = useState<Reward[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
  loadRewards();
 }, []);

 const loadRewards = async () => {
  try {
   setLoading(true);
   const response = await fetch('/api/admin/loyalty/rewards');
   if (!response.ok) throw new Error('Sadakat ödülleri yüklenemedi.');
   const raw = await response.json();
   // Resilient unwrap
   const list = raw?.data?.data || raw?.data || raw?.rewards || [];
   setRewards(Array.isArray(list) ? list : []);
   setError(null);
  } catch (err) {
   setError(err instanceof Error ? err.message : 'Hata oluştu.');
  } finally {
   setLoading(false);
  }
 };

 const totalPoints = rewards.reduce((s, r) => s + (r.points_cost || 0), 0);
 const avgPoints = rewards.length > 0 ? Math.round(totalPoints / rewards.length) : 0;
 const categories = new Set(rewards.map(r => r.category)).size;
 const maxCost = rewards.length > 0 ? Math.max(...rewards.map(r => r.points_cost || 0)) : 0;

 return (
  <div className="alp-page">
   <div className="alp-stats">
    <div className="alp-stat alp-stat--indigo">
     <div className="alp-stat-icon"><Gift className="w-5 h-5" /></div>
     <div>
      <p className="alp-stat-val">{rewards.length}</p>
      <p className="alp-stat-lbl">Toplam Ödül</p>
     </div>
    </div>
    <div className="alp-stat alp-stat--amber">
     <div className="alp-stat-icon"><Tag className="w-5 h-5" /></div>
     <div>
      <p className="alp-stat-val">{categories}</p>
      <p className="alp-stat-lbl">Kategori</p>
     </div>
    </div>
    <div className="alp-stat alp-stat--emerald">
     <div className="alp-stat-icon"><Award className="w-5 h-5" /></div>
     <div>
      <p className="alp-stat-val">{avgPoints.toLocaleString('tr-TR')}</p>
      <p className="alp-stat-lbl">Ortalama Puan</p>
     </div>
    </div>
    <div className="alp-stat alp-stat--violet">
     <div className="alp-stat-icon"><Trophy className="w-5 h-5" /></div>
     <div>
      <p className="alp-stat-val">{maxCost.toLocaleString('tr-TR')}</p>
      <p className="alp-stat-lbl">En Yüksek Puan</p>
     </div>
    </div>
   </div>

   <section className="alp-section">
    <header className="alp-section-head">
     <h3 className="alp-section-title">
      <Sparkles className="w-4 h-4" /> Ödül Kataloğu
     </h3>
     <span className="alp-section-meta">{rewards.length} ödül</span>
    </header>

    {error && (
     <div className="alp-error">{error}</div>
    )}

    {loading && (
     <div className="alp-grid">
      {[1,2,3,4,5,6].map(i => <div key={i} className="alp-skel" />)}
     </div>
    )}

    {!loading && !error && rewards.length === 0 && (
     <p className="alp-empty">
      <Gift className="w-8 h-8" />
      <span>Henüz ödül tanımlanmamış.</span>
      <small>API üzerinden veya doğrudan DB seed ile ödül ekleyebilirsiniz.</small>
     </p>
    )}

    {!loading && rewards.length > 0 && (
     <div className="alp-grid">
      {rewards.map((reward) => {
       const meta = categoryBadge(reward.category);
       return (
        <article
         key={reward.id}
         className="alp-card"
         style={{ ['--alp-c-bg' as string]: meta.bg, ['--alp-c-fg' as string]: meta.color }}
        >
         <div className="alp-card-row">
          <div className="alp-card-icon" aria-hidden="true">{meta.icon}</div>
          <div className="alp-card-points">
           <Award className="w-3 h-3" />
           <strong>{reward.points_cost.toLocaleString('tr-TR')}</strong>
           <span>puan</span>
          </div>
         </div>
         <h4 className="alp-card-name">{reward.reward_name}</h4>
         <p className="alp-card-category">{reward.category}</p>
        </article>
       );
      })}
     </div>
    )}
   </section>

   <style>{`
    .alp-page { display: flex; flex-direction: column; gap: 1.25rem; }

    .alp-stats {
     display: grid;
     grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
     gap: 1rem;
    }
    .alp-stat {
     display: flex; align-items: center; gap: 0.95rem;
     padding: 1.1rem 1.25rem;
     background: var(--adm-bg-elev);
     border: 1px solid var(--adm-border);
     border-radius: 12px;
     position: relative;
     overflow: hidden;
    }
    .alp-stat::before {
     content: '';
     position: absolute; inset: 0;
     background: radial-gradient(circle at 100% 0%, var(--alp-c-fg) 0%, transparent 55%);
     opacity: 0.06;
     pointer-events: none;
    }
    .alp-stat--indigo { --alp-c-fg: rgb(99,102,241); --alp-c-bg: rgba(99,102,241,0.12); }
    .alp-stat--emerald { --alp-c-fg: rgb(5,150,105); --alp-c-bg: rgba(16,185,129,0.12); }
    .alp-stat--amber { --alp-c-fg: rgb(180,83,9); --alp-c-bg: rgba(217,119,6,0.12); }
    .alp-stat--violet { --alp-c-fg: rgb(124,58,237); --alp-c-bg: rgba(139,92,246,0.12); }
    .alp-stat-icon {
     width: 42px; height: 42px;
     border-radius: 11px;
     background: var(--alp-c-bg);
     color: var(--alp-c-fg);
     display: inline-flex; align-items: center; justify-content: center;
     flex-shrink: 0;
     position: relative;
    }
    .alp-stat-val {
     font-family: 'Cormorant Garamond', serif;
     font-size: 1.85rem; font-weight: 700;
     color: var(--adm-text);
     line-height: 1;
     margin: 0;
     letter-spacing: -0.02em;
    }
    .alp-stat-lbl {
     font-size: 0.78rem; font-weight: 600;
     color: var(--adm-text-muted);
     margin: 0.3rem 0 0;
    }

    .alp-section {
     background: var(--adm-bg-elev);
     border: 1px solid var(--adm-border);
     border-radius: 12px;
     overflow: hidden;
    }
    .alp-section-head {
     display: flex; align-items: center; justify-content: space-between;
     padding: 0.95rem 1.15rem;
     background: var(--adm-bg-hover);
     border-bottom: 1px solid var(--adm-border);
    }
    .alp-section-title {
     display: inline-flex; align-items: center; gap: 0.5rem;
     margin: 0;
     font-size: 0.95rem; font-weight: 600;
     color: var(--adm-text);
    }
    .alp-section-meta {
     font-size: 0.78rem;
     color: var(--adm-text-soft);
     font-weight: 500;
    }

    .alp-error {
     margin: 1rem 1.15rem;
     padding: 0.75rem 1rem;
     background: rgba(225,29,72,0.08);
     border: 1px solid rgba(225,29,72,0.25);
     border-radius: 8px;
     color: rgb(190,18,60);
     font-size: 0.86rem;
    }

    .alp-grid {
     display: grid;
     grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
     gap: 0.85rem;
     padding: 1rem 1.15rem;
    }
    .alp-skel {
     height: 130px;
     background: var(--adm-bg);
     border: 1px solid var(--adm-border);
     border-radius: 10px;
     position: relative;
     overflow: hidden;
    }
    .alp-skel::after {
     content: '';
     position: absolute; inset: 0;
     background: linear-gradient(90deg, transparent, var(--adm-bg-hover), transparent);
     animation: alpShimmer 1.4s infinite;
    }
    @keyframes alpShimmer {
     from { transform: translateX(-100%); }
     to { transform: translateX(100%); }
    }

    .alp-card {
     padding: 1rem 1.15rem;
     background: var(--adm-bg);
     border: 1px solid var(--adm-border);
     border-radius: 10px;
     position: relative;
     overflow: hidden;
     transition: transform 0.18s, border-color 0.18s;
    }
    .alp-card::before {
     content: '';
     position: absolute; inset: 0;
     background: radial-gradient(circle at 100% 0%, var(--alp-c-fg) 0%, transparent 55%);
     opacity: 0.07;
     pointer-events: none;
    }
    .alp-card:hover {
     transform: translateY(-2px);
     border-color: var(--alp-c-fg);
    }
    .alp-card-row {
     display: flex; align-items: center; justify-content: space-between;
     margin-bottom: 0.65rem;
     position: relative;
    }
    .alp-card-icon {
     width: 38px; height: 38px;
     border-radius: 10px;
     background: var(--alp-c-bg);
     display: inline-flex; align-items: center; justify-content: center;
     font-size: 1.25rem;
    }
    .alp-card-points {
     display: inline-flex; align-items: center; gap: 0.25rem;
     padding: 0.3rem 0.65rem;
     background: var(--alp-c-bg);
     color: var(--alp-c-fg);
     border-radius: 999px;
     font-size: 0.78rem;
    }
    .alp-card-points strong { font-weight: 700; }
    .alp-card-points span { opacity: 0.85; }
    .alp-card-name {
     font-size: 0.95rem; font-weight: 600;
     color: var(--adm-text);
     margin: 0 0 0.25rem;
     line-height: 1.3;
     position: relative;
    }
    .alp-card-category {
     font-size: 0.74rem;
     color: var(--adm-text-soft);
     text-transform: uppercase;
     letter-spacing: 0.04em;
     font-weight: 600;
     margin: 0;
     position: relative;
    }

    .alp-empty {
     padding: 2.5rem 1rem;
     text-align: center;
     color: var(--adm-text-soft);
     margin: 0;
     display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
    }
    .alp-empty span { font-weight: 600; color: var(--adm-text-muted); }
    .alp-empty small { font-size: 0.78rem; opacity: 0.8; }
   `}</style>
  </div>
 );
}
