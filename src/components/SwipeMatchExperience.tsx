import { useEffect, useMemo, useState } from 'react';

type Candidate = {
  userId: string;
  username: string;
  fullName: string;
  bio: string;
  photos: string[];
};

type MatchUser = {
  id: number;
  created_at: string;
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

type SwipeProfile = {
  userId: string;
  bio: string;
  photos: string[];
};

type TabKey = 'discover' | 'matches' | 'profile';

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const body = await response.json();
  if (!response.ok || body?.success === false) {
    throw new Error(body?.error?.message || body?.message || 'İşlem başarısız');
  }
  return body as T;
}

export default function SwipeMatchExperience() {
  const [tab, setTab] = useState<TabKey>('discover');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [matches, setMatches] = useState<MatchUser[]>([]);
  const [profile, setProfile] = useState<SwipeProfile>({ userId: '', bio: '', photos: [] });
  const [matchedNotice, setMatchedNotice] = useState<string>('');

  const activeCandidate = useMemo(() => candidates[0] || null, [candidates]);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, candidatesRes, matchesRes] = await Promise.all([
        fetchJson<{ data: SwipeProfile }>('/api/social/swipe/profile'),
        fetchJson<{ data: Candidate[] }>('/api/social/swipe/candidates?limit=20'),
        fetchJson<{ data: MatchUser[] }>('/api/social/swipe/matches?limit=50')
      ]);

      setProfile(profileRes.data);
      setCandidates(candidatesRes.data || []);
      setMatches(matchesRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const onSwipe = async (direction: 'like' | 'pass') => {
    if (!activeCandidate || busy) {
      return;
    }

    const target = activeCandidate;
    setBusy(true);
    setError(null);
    setMatchedNotice('');
    try {
      const result = await fetchJson<{ data: { matched: boolean } }>('/api/social/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: target.userId, direction })
      });

      setCandidates((prev) => prev.slice(1));

      if (result.data?.matched) {
        setMatchedNotice(`${target.fullName || target.username || 'Kullanıcı'} ile eşleşme oluştu.`);
        const latestMatches = await fetchJson<{ data: MatchUser[] }>('/api/social/swipe/matches?limit=50');
        setMatches(latestMatches.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const onSaveProfile = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        bio: profile.bio || '',
        photos: (profile.photos || []).filter(Boolean).slice(0, 4)
      };
      const result = await fetchJson<{ data: SwipeProfile }>('/api/social/swipe/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setProfile(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const onUnmatch = async (matchId: number) => {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await fetchJson<{ data: { matchId: number } }>('/api/social/swipe/unmatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId })
      });
      const latestMatches = await fetchJson<{ data: MatchUser[] }>('/api/social/swipe/matches?limit=50');
      setMatches(latestMatches.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl bg-white/10 p-6 text-sm text-urfa-100">
        Eşleşme verileri yükleniyor...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('discover')}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === 'discover' ? 'bg-white text-urfa-900' : 'bg-white/10 text-white'}`}
        >
          Keşfet
        </button>
        <button
          type="button"
          onClick={() => setTab('matches')}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === 'matches' ? 'bg-white text-urfa-900' : 'bg-white/10 text-white'}`}
        >
          Eşleşmeler
        </button>
        <button
          type="button"
          onClick={() => setTab('profile')}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === 'profile' ? 'bg-white text-urfa-900' : 'bg-white/10 text-white'}`}
        >
          Profilim
        </button>
      </div>

      {error && <div className="rounded-2xl bg-red-500/20 p-4 text-sm text-red-100">{error}</div>}
      {matchedNotice && <div className="rounded-2xl bg-emerald-500/20 p-4 text-sm text-emerald-100">{matchedNotice}</div>}

      {tab === 'discover' && (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <article className="overflow-hidden rounded-3xl bg-white text-gray-900 shadow-2xl">
            {activeCandidate ? (
              <>
                <div className="relative aspect-[4/5]">
                  <img
                    src={activeCandidate.photos[0] || '/images/placeholder.svg'}
                    alt={`${activeCandidate.fullName || activeCandidate.username} profil fotoğrafı`}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5 text-white">
                    <h2 className="text-2xl font-display font-bold">
                      {activeCandidate.fullName || 'Kullanıcı'}
                    </h2>
                    <p className="text-sm text-white/80">@{activeCandidate.username || 'kullanici'}</p>
                  </div>
                </div>
                <div className="p-5">
                  <p className="min-h-[60px] text-sm text-gray-600">
                    {activeCandidate.bio || 'Henüz biyografi eklenmemiş.'}
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onSwipe('pass')}
                      className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50"
                    >
                      Sola kaydır
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onSwipe('like')}
                      className="rounded-full bg-urfa-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Sağa kaydır
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-sm text-gray-600">
                Şu an gösterilecek yeni profil yok. Biraz sonra tekrar deneyin.
              </div>
            )}
          </article>

          <div className="rounded-3xl bg-white/10 p-6">
            <h3 className="text-xl font-display font-bold text-white">Nasıl çalışır?</h3>
            <ol className="mt-4 space-y-3 text-sm text-urfa-100">
              <li>1. Profil kartını inceleyin.</li>
              <li>2. İlgileniyorsanız sağa, ilgilenmiyorsanız sola kaydırın.</li>
              <li>3. Karşılıklı sağa kaydırma olduğunda eşleşme oluşur.</li>
              <li>4. Eşleşme sonrası mevcut mesaj altyapısıyla sohbet başlatabilirsiniz.</li>
            </ol>
          </div>
        </div>
      )}

      {tab === 'matches' && (
        <div className="rounded-3xl bg-white/10 p-6">
          <h3 className="text-xl font-display font-bold text-white">Eşleşmelerim</h3>
          {matches.length === 0 ? (
            <p className="mt-4 text-sm text-urfa-100">Henüz eşleşme yok.</p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {matches.map((item) => (
                <div key={`${item.id}-${item.user_id}`} className="rounded-2xl bg-white/90 p-4 text-gray-900">
                  <a href={`/kullanici/${item.user_id}`} className="block hover:opacity-90">
                    <p className="font-semibold">{item.full_name || item.username || 'Kullanıcı'}</p>
                    <p className="text-xs text-gray-600">@{item.username || 'kullanici'}</p>
                  </a>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onUnmatch(item.id)}
                    className="mt-3 rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 disabled:opacity-50"
                  >
                    Eşleşmeyi kaldır
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'profile' && (
        <div className="rounded-3xl bg-white/10 p-6">
          <h3 className="text-xl font-display font-bold text-white">Eşleşme Profili</h3>
          <p className="mt-2 text-sm text-urfa-100">Maksimum 4 fotoğraf bağlantısı ekleyebilirsiniz.</p>
          <div className="mt-4 space-y-3">
            <textarea
              value={profile.bio}
              onChange={(event) => setProfile((prev) => ({ ...prev, bio: event.target.value }))}
              maxLength={600}
              rows={4}
              className="w-full rounded-xl border border-white/20 bg-white/90 px-3 py-2 text-sm text-gray-900"
              placeholder="Kendinizi ve Şanlıurfa ilgi alanlarınızı kısaca yazın"
            />
            {[0, 1, 2, 3].map((index) => (
              <input
                key={index}
                type="url"
                value={profile.photos[index] || ''}
                onChange={(event) => {
                  const next = [...profile.photos];
                  next[index] = event.target.value;
                  setProfile((prev) => ({ ...prev, photos: next }));
                }}
                placeholder={`Fotoğraf URL ${index + 1}`}
                className="w-full rounded-xl border border-white/20 bg-white/90 px-3 py-2 text-sm text-gray-900"
              />
            ))}
            <button
              type="button"
              disabled={busy}
              onClick={onSaveProfile}
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-urfa-900 disabled:opacity-50"
            >
              Profili kaydet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
