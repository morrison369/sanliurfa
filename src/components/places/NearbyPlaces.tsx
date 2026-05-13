import { useState, useEffect } from 'react';

interface Place {
  id: string;
  name: string;
  slug: string;
  category_name: string;
  latitude: number;
  longitude: number;
  image_url?: string;
  rating?: number;
  distance?: number;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface Props {
  initialPlaces: Place[];
}

export default function NearbyPlaces({ initialPlaces }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'denied'>('idle');
  const [sorted, setSorted] = useState<Place[]>([]);

  const locate = () => {
    if (!navigator.geolocation) { setStatus('denied'); return; }
    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const withDist = initialPlaces
          .filter((p) => p.latitude && p.longitude)
          .map((p) => ({ ...p, distance: haversineKm(latitude, longitude, p.latitude, p.longitude) }))
          .sort((a, b) => (a.distance ?? 99) - (b.distance ?? 99))
          .slice(0, 6);
        setSorted(withDist);
        setStatus('done');
      },
      () => setStatus('denied'),
      { timeout: 8000 },
    );
  };

  if (status === 'idle') {
    return (
      <div className="np-prompt">
        <button className="np-btn" onClick={locate}>
          📍 Bana En Yakın Mekanları Göster
        </button>
        <style>{`
          .np-prompt { text-align: center; padding: 1.5rem 0; }
          .np-btn {
            padding: .65rem 1.4rem; border-radius: .7rem;
            background: #78331d; color: #fff;
            border: none; font-size: .9rem; font-weight: 700; cursor: pointer;
            transition: opacity .15s;
          }
          .np-btn:hover { opacity: .88; }
        `}</style>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted, #777)', fontSize: '.9rem' }}>
        Konumunuz alınıyor…
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted, #777)', fontSize: '.85rem' }}>
        Konum izni verilmedi. Tarayıcı ayarlarından izin verip tekrar deneyin.
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted, #777)', fontSize: '.85rem' }}>
        Yakınızda kayıtlı mekan bulunamadı.
      </div>
    );
  }

  return (
    <div>
      <ul className="np-list">
        {sorted.map((p) => (
          <li key={p.id}>
            <a href={`/isletme/${p.slug}`} className="np-card">
              <span className="np-name">{p.name}</span>
              <span className="np-meta">
                <span className="np-cat">{p.category_name}</span>
                {p.distance !== undefined && (
                  <span className="np-dist">{p.distance < 1 ? `${Math.round(p.distance * 1000)}m` : `${p.distance.toFixed(1)}km`}</span>
                )}
              </span>
            </a>
          </li>
        ))}
      </ul>
      <style>{`
        .np-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: .5rem; }
        .np-card {
          display: flex; justify-content: space-between; align-items: center;
          padding: .75rem 1rem; background: var(--bg-card, #fff);
          border: 1px solid rgba(184,115,51,.12); border-radius: .7rem;
          text-decoration: none; transition: background .15s;
        }
        .np-card:hover { background: rgba(184,115,51,.05); }
        .np-name { font-size: .9rem; font-weight: 600; color: var(--text-primary, #1a1a1a); }
        .np-meta { display: flex; flex-direction: column; align-items: flex-end; gap: .1rem; }
        .np-cat { font-size: .72rem; color: var(--text-muted, #777); }
        .np-dist { font-size: .75rem; font-weight: 700; color: var(--urfa-600, #b87333); }
      `}</style>
    </div>
  );
}
