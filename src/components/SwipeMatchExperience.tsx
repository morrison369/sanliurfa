import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { computeSwipeThreshold } from '../lib/social/swipe-ui';

interface MatchProfile {
 bio: string;
 photos: string[];
 is_discoverable: boolean;
}

interface MatchCandidate {
 userId: string;
 fullName: string;
 username?: string;
 bio?: string;
 photos?: string[];
}

interface UserMatch {
 otherUserId: string;
 otherUserName: string;
 otherUsername?: string;
 conversationId?: string | null;
}

interface SwipeQuota {
 dailyLimit: number;
 usedToday: number;
 remaining: number;
}

interface SocialCapabilities {
 features: {
 openAccess: boolean;
 tinderEnabled: boolean;
 autoConversationOnMatch: boolean;
 dailySwipeLimit: number;
 };
 quota: SwipeQuota;
 premiumRequired: boolean;
}

const EMPTY_PROFILE: MatchProfile = {
 bio: '',
 photos: [],
 is_discoverable: true,
};

export default function SwipeMatchExperience() {
 const [profile, setProfile] = useState<MatchProfile>(EMPTY_PROFILE);
 const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
 const [matches, setMatches] = useState<UserMatch[]>([]);
 const [quota, setQuota] = useState<SwipeQuota | null>(null);
 const [capabilities, setCapabilities] = useState<SocialCapabilities | null>(null);
 const [info, setInfo] = useState('');
 const [swipeHint, setSwipeHint] = useState('');
 const [saving, setSaving] = useState(false);
 const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
 const [swipeThreshold, setSwipeThreshold] = useState(160);
 const [dragX, setDragX] = useState(0);
 const [dragging, setDragging] = useState(false);
 const [swiping, setSwiping] = useState(false);
 const dragStartX = useRef<number | null>(null);
 const dragStartTime = useRef<number | null>(null);
 const lastDragX = useRef(0);
 const lastDragTime = useRef<number | null>(null);

 const topCandidate = useMemo(() => candidates[0] || null, [candidates]);
 const stackCandidates = useMemo(() => candidates.slice(0, 3), [candidates]);
 const hasQuotaExhausted = quota ? quota.remaining <= 0 : false;

 async function loadProfile() {
 const res = await fetch('/api/social/match-profile');
 const data = await res.json();
 setProfile(data?.data || EMPTY_PROFILE);
 }

 async function loadCandidates() {
 const res = await fetch('/api/social/match-candidates?limit=20');
 const data = await res.json();
 setCandidates(Array.isArray(data?.data) ? data.data : []);
 if (data?.quota) setQuota(data.quota);
 }

 async function loadMatches() {
 const res = await fetch('/api/social/matches?limit=20');
 const data = await res.json();
 setMatches(Array.isArray(data?.data) ? data.data : []);
 }

 async function loadCapabilities() {
 const res = await fetch('/api/social/capabilities');
 const data = await res.json();
 if (!res.ok) return;
 setCapabilities(data?.data || null);
 if (data?.data?.quota) setQuota(data.data.quota);
 }

 useEffect(() => {
 loadProfile();
 loadCandidates();
 loadMatches();
 loadCapabilities();
 }, []);

 useEffect(() => {
 const updateThreshold = () => {
 setSwipeThreshold(computeSwipeThreshold(window.innerWidth));
 };
 updateThreshold();
 window.addEventListener('resize', updateThreshold);
 return () => window.removeEventListener('resize', updateThreshold);
 }, []);

 useEffect(() => {
 if (!dragging) {
 setSwipeHint('');
 return;
 }
 if (dragX >= swipeThreshold) {
 setSwipeHint('Birakirsan begeni gonderilecek');
 return;
 }
 if (dragX <= -swipeThreshold) {
 setSwipeHint('Birakirsan gecilecek');
 return;
 }
 setSwipeHint('');
 }, [dragX, dragging, swipeThreshold]);

 async function saveProfile(e: React.SyntheticEvent<HTMLFormElement>) {
 e.preventDefault();
 if (profile.photos.length > 4) {
 setInfo('En fazla 4 fotoğraf ekleyebilirsiniz.');
 return;
 }

 setSaving(true);
 try {
 const res = await fetch('/api/social/match-profile', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 bio: profile.bio,
 photos: profile.photos.filter(Boolean).slice(0, 4),
 isDiscoverable: profile.is_discoverable,
 }),
 });
 const data = await res.json();
 if (!res.ok) {
 setInfo(data?.error || 'Profil kaydedilemedi');
 return;
 }
 setInfo('Profil kaydedildi.');
 } finally {
 setSaving(false);
 }
 }

 async function handleSwipe(direction: string, candidate: MatchCandidate) {
 if (!['left', 'right'].includes(direction)) return;
 if (quota && quota.remaining <= 0) {
 setInfo('Günlük swipe limitine ulaştınız.');
 return;
 }

 const res = await fetch('/api/social/swipe', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 targetUserId: candidate.userId,
 direction,
 }),
 });
 const data = await res.json();
 if (!res.ok) {
 setInfo(data?.error || 'Kaydırma işlemi başarısız');
 return;
 }

 setCandidates((prev) => prev.filter((c) => c.userId !== candidate.userId));
 if (data?.isMatch) {
 if (data?.conversationId) {
 setInfo('Yeni eşleşme oluştu. Sohbet otomatik hazırlandı.');
 } else {
 setInfo('Yeni eşleşme oluştu!');
 }
 await loadMatches();
 } else {
 setInfo(direction === 'right' ? 'Beğeni kaydedildi.' : 'Geçildi.');
 }
 if (data?.quota) {
 setQuota(data.quota);
 }
 }

 function updatePhoto(index: number, value: string) {
 const next = [...profile.photos];
 next[index] = value;
 setProfile((prev) => ({ ...prev, photos: next.slice(0, 4) }));
 }

 const uploadTinderPhoto = useCallback(async (index: number, file: File) => {
 if (uploadingIndex !== null) return;
 setUploadingIndex(index);
 setInfo('');
 const fd = new FormData();
 fd.append('photo', file);
 try {
 const res = await fetch('/api/social/tinder-photos', { method: 'POST', body: fd });
 const data = await res.json();
 if (!res.ok) { setInfo(data?.error || 'Fotoğraf yüklenemedi'); return; }
 const photos: string[] = Array.isArray(data?.data?.photos) ? data.data.photos : [];
 setProfile((prev) => ({ ...prev, photos }));
 setInfo('Fotoğraf yüklendi.');
 } catch {
 setInfo('Bağlantı hatası.');
 } finally {
 setUploadingIndex(null);
 }
 }, [uploadingIndex]);

 const deleteTinderPhoto = useCallback(async (index: number) => {
 if (uploadingIndex !== null) return;
 setUploadingIndex(index);
 try {
 const res = await fetch(`/api/social/tinder-photos?index=${index}`, { method: 'DELETE' });
 const data = await res.json();
 if (!res.ok) { setInfo(data?.error || 'Fotoğraf silinemedi'); return; }
 const photos: string[] = Array.isArray(data?.data?.photos) ? data.data.photos : [];
 setProfile((prev) => ({ ...prev, photos }));
 setInfo('Fotoğraf silindi.');
 } catch {
 setInfo('Bağlantı hatası.');
 } finally {
 setUploadingIndex(null);
 }
 }, [uploadingIndex]);

 async function triggerSwipe(direction: 'left' | 'right') {
 if (!topCandidate) return;
 setSwiping(true);
 setDragX(direction === 'right' ? swipeThreshold * 1.5 : -swipeThreshold * 1.5);
 await new Promise((resolve) => setTimeout(resolve, 140));
 setDragX(0);
 setDragging(false);
 setSwiping(false);
 await handleSwipe(direction, topCandidate);
 }

 function handlePointerDown(e: React.PointerEvent<HTMLElement>) {
 if (!topCandidate || hasQuotaExhausted || swiping) return;
 e.currentTarget.setPointerCapture(e.pointerId);
 dragStartX.current = e.clientX;
 dragStartTime.current = Date.now();
 lastDragTime.current = Date.now();
 lastDragX.current = 0;
 setDragging(true);
 }

 function handlePointerMove(e: React.PointerEvent<HTMLElement>) {
 if (!dragging || dragStartX.current === null) return;
 const nextDragX = e.clientX - dragStartX.current;
 setDragX(nextDragX);
 lastDragX.current = nextDragX;
 lastDragTime.current = Date.now();
 }

 async function handlePointerUp() {
 if (!topCandidate) {
 setDragging(false);
 setDragX(0);
 dragStartX.current = null;
 dragStartTime.current = null;
 lastDragTime.current = null;
 lastDragX.current = 0;
 return;
 }

 const delta = dragX;
 const elapsed = dragStartTime.current ? Math.max(1, Date.now() - dragStartTime.current) : 1;
 const velocity = delta / elapsed;
 const velocityThreshold = 0.45;
 const crossedByDistance = Math.abs(delta) >= swipeThreshold;
 const crossedByVelocity = Math.abs(velocity) >= velocityThreshold && Math.abs(delta) >= 32;

 setDragging(false);
 dragStartX.current = null;
 dragStartTime.current = null;
 lastDragTime.current = null;
 lastDragX.current = 0;

 if (!(crossedByDistance || crossedByVelocity)) {
 setDragX(0);
 return;
 }

 const direction = delta >= 0 ? 'right' : 'left';
 setSwiping(true);
 setDragX(direction === 'right' ? swipeThreshold * 1.6 : -swipeThreshold * 1.6);
 await new Promise((resolve) => setTimeout(resolve, 140));
 setDragging(false);
 setDragX(0);
 setSwiping(false);
 await handleSwipe(direction, topCandidate);
 }

 useEffect(() => {
 function onKeydown(e: KeyboardEvent) {
 if (!topCandidate || hasQuotaExhausted || swiping || dragging) return;
 if (e.key === 'ArrowLeft') {
 e.preventDefault();
 void triggerSwipe('left');
 }
 if (e.key === 'ArrowRight') {
 e.preventDefault();
 void triggerSwipe('right');
 }
 }
 window.addEventListener('keydown', onKeydown);
 return () => window.removeEventListener('keydown', onKeydown);
 }, [topCandidate, hasQuotaExhausted, swiping, dragging, swipeThreshold]);

 return (
 <div className="min-h-screen bg-[rgba(184,115,51,0.04)] py-8">
 <div className="container mx-auto max-w-5xl px-4">
 <div className="mb-6 rounded-sm border border-[rgba(234,179,8,0.25)] bg-[rgba(234,179,8,0.08)] p-4 text-amber-400">
 Faz 1 açık erişim: eşleşme, mesajlaşma ve profil özellikleri ücretsizdir.
 {quota && (
 <div className="mt-2 text-sm">
 Günlük swipe: {quota.usedToday}/{quota.dailyLimit} (kalan: {quota.remaining})
 </div>
 )}
 {capabilities?.features?.tinderEnabled === false && (
 <div className="mt-2 text-sm font-semibold">Eşleşme özelliği geçici olarak kapalı.</div>
 )}
 </div>

 <div className="grid gap-6 lg:grid-cols-2">
 <section className="rounded-sm border border-[rgba(184,115,51,0.14)] bg-[var(--bg-card)] p-4 shadow-sm">
 <h2 className="mb-3 text-xl font-bold text-[#1F1410]">Eşleşme Profili</h2>

 {/* Discoverable toggle — prominent */}
 <div className={`mb-4 rounded-sm border p-3 ${profile.is_discoverable ? 'border-green-700/30 bg-green-900/10' : 'border-red-700/30 bg-red-900/10'}`}>
 <label className="flex cursor-pointer items-center justify-between gap-2">
 <div>
 <span className="block text-sm font-semibold text-[#1F1410]">
 {profile.is_discoverable ? '✓ Eşleşme Özelliği Açık' : '✕ Eşleşme Özelliği Kapalı'}
 </span>
 <span className="text-xs text-[#7A6B58]">
 {profile.is_discoverable ? 'Diğer üyeler sizi keşfedebilir.' : 'Kimse sizi göremez, siz de göremezsiniz.'}
 </span>
 </div>
 <div
 role="switch"
 aria-checked={profile.is_discoverable}
 className={`relative h-6 w-11 rounded-full transition-colors ${profile.is_discoverable ? 'bg-green-600' : 'bg-[rgba(184,115,51,0.25)]'}`}
 onClick={() => setProfile((prev) => ({ ...prev, is_discoverable: !prev.is_discoverable }))}
 style={{ cursor: 'pointer' }}
 >
 <span
 className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
 style={{ left: profile.is_discoverable ? '1.375rem' : '0.125rem' }}
 />
 </div>
 </label>
 </div>

 <form className="space-y-3" onSubmit={saveProfile}>
 <textarea
 className="w-full rounded-sm border border-[rgba(184,115,51,0.25)] bg-transparent p-2 text-sm text-[#1F1410] placeholder-[#7A6B58]"
 rows={3}
 maxLength={400}
 placeholder="Kısa tanıtım yazın (isteğe bağlı)"
 value={profile.bio}
 onChange={(e) => setProfile((prev) => ({ ...prev, bio: e.target.value }))}
 />

 <p className="text-xs text-[#7A6B58]">Fotoğraflar (en fazla 4) — profil fotoğraflarınız swipe kartında görünür</p>

 <div className="grid grid-cols-2 gap-2">
 {[0, 1, 2, 3].map((i) => {
 const photoUrl = profile.photos[i];
 const isUploading = uploadingIndex === i;
 return (
 <div key={i} className="relative aspect-square overflow-hidden rounded-sm border border-[rgba(184,115,51,0.25)] bg-[rgba(184,115,51,0.04)]">
 {photoUrl ? (
 <>
 <img src={photoUrl} alt={`Fotoğraf ${i + 1}`} width={300} height={300} className="h-full w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
 <button
 type="button"
 className="absolute right-1 top-1 rounded-sm bg-red-600 px-1.5 py-0.5 text-xs text-white hover:bg-red-700 disabled:opacity-60"
 disabled={uploadingIndex !== null}
 onClick={() => deleteTinderPhoto(i)}
 >
 Sil
 </button>
 </>
 ) : (
 <label className="flex h-full cursor-pointer flex-col items-center justify-center gap-1 text-[#7A6B58] hover:text-[#7A6B58]">
 {isUploading ? (
 <span className="text-xs">Yükleniyor...</span>
 ) : (
 <>
 <span className="text-2xl">+</span>
 <span className="text-xs">Fotoğraf {i + 1}</span>
 <input
 type="file"
 accept="image/jpeg,image/png,image/webp"
 className="hidden"
 disabled={uploadingIndex !== null}
 onChange={(e) => {
 const file = e.target.files?.[0];
 if (file) void uploadTinderPhoto(i, file);
 e.target.value = '';
 }}
 />
 </>
 )}
 </label>
 )}
 </div>
 );
 })}
 </div>

 <button
 type="submit"
 disabled={saving}
 className="w-full rounded-sm bg-urfa-600 px-4 py-2 font-medium text-white hover:bg-urfa-700 disabled:opacity-60"
 >
 {saving ? 'Kaydediliyor...' : 'Bio & Ayarları Kaydet'}
 </button>
 </form>
 </section>

 <section className="rounded-sm border border-[rgba(184,115,51,0.14)] bg-[var(--bg-card)] p-4 shadow-sm">
 <h2 className="mb-3 text-xl font-bold text-[#1F1410]">Swipe Kartı</h2>

 <div className="relative h-[420px] overflow-hidden rounded-sm border border-[rgba(184,115,51,0.14)] bg-[rgba(184,115,51,0.04)]">
 {candidates.length === 0 && (
 <div className="flex h-full items-center justify-center p-4 text-center text-sm text-[#7A6B58]">
 Yeni aday kalmadı. Daha sonra tekrar deneyin.
 </div>
 )}

 {stackCandidates
 .slice()
 .reverse()
 .map((candidate, reversedIndex) => {
 const stackIndex = stackCandidates.length - 1 - reversedIndex;
 const isTop = stackIndex === 0;
 const depthOffset = Math.min(stackIndex, 2);
 const baseScale = 1 - depthOffset * 0.04;
 const baseTranslateY = depthOffset * 10;
 const topTransform = `translateX(${dragX}px) translateY(${baseTranslateY}px) rotate(${Math.max(
 -10,
 Math.min(10, dragX / 24)
 )}deg) scale(${baseScale})`;
 const restTransform = `translateY(${baseTranslateY}px) scale(${baseScale})`;

 return (
 <article
 key={candidate.userId}
 className="absolute inset-3 rounded-sm border border-[rgba(184,115,51,0.14)] bg-[var(--bg-card)] p-3 shadow-sm select-none"
 style={{
 zIndex: 10 - stackIndex,
 transform: isTop ? topTransform : restTransform,
 transition: isTop && dragging ? 'none' : 'transform 180ms ease-out, opacity 180ms ease-out',
 opacity: isTop ? 1 : 0.92 - depthOffset * 0.1,
 pointerEvents: isTop ? 'auto' : 'none',
 touchAction: isTop ? 'pan-y' : 'auto',
 }}
 onPointerDown={isTop ? handlePointerDown : undefined}
 onPointerMove={isTop ? handlePointerMove : undefined}
 onPointerUp={isTop ? handlePointerUp : undefined}
 onPointerCancel={isTop ? handlePointerUp : undefined}
 >
 <img
 src={candidate.photos?.[0] || '/images/placeholder.jpg'}
 alt={candidate.fullName}
 className="mb-3 h-56 w-full rounded-sm object-cover"
 onError={(e) => {
 (e.currentTarget as HTMLImageElement).src = '/images/placeholder.jpg';
 }}
 />
 <h3 className="text-lg font-bold text-[#1F1410]">{candidate.fullName}</h3>
 <p className="text-sm text-[#7A6B58]">@{candidate.username || 'uye'}</p>
 <p className="mt-2 text-sm text-[#7A6B58]">{candidate.bio || 'Henüz biyografi yok.'}</p>
 </article>
 );
 })}
 </div>

 <div className="mt-3 grid grid-cols-2 gap-2">
 <button
 type="button"
 onClick={() => triggerSwipe('left')}
 disabled={!topCandidate || hasQuotaExhausted}
 className="rounded-sm bg-[rgba(184,115,51,0.08)] px-3 py-2 text-[#1F1410] hover:bg-[rgba(184,115,51,0.12)] disabled:opacity-60"
 >
 Sola Kaydır
 </button>
 <button
 type="button"
 onClick={() => triggerSwipe('right')}
 disabled={!topCandidate || hasQuotaExhausted}
 className="rounded-sm bg-green-600 px-3 py-2 text-white hover:bg-green-700 disabled:opacity-60"
 >
 Sağa Kaydır
 </button>
 </div>
 <p className="mt-2 text-xs text-[#7A6B58]">Klavye: ← geç, → beğen</p>
 {!!swipeHint && <p className="mt-2 text-xs text-amber-400">{swipeHint}</p>}
 <p className="mt-2 text-sm text-[#7A6B58]">{info}</p>
 </section>
 </div>

 <section className="mt-6 rounded-sm border border-[rgba(184,115,51,0.14)] bg-[var(--bg-card)] p-4 shadow-sm">
 <h2 className="mb-3 text-xl font-bold text-[#1F1410]">Eşleşmelerim</h2>
 <div className="space-y-2 text-sm text-[#7A6B58]">
 {matches.length === 0 ? (
 <p>Henüz eşleşme yok.</p>
 ) : (
 matches.map((m) => (
 <a
 key={m.otherUserId}
 className="block rounded-sm border border-[rgba(184,115,51,0.14)] p-3 hover:bg-[rgba(184,115,51,0.04)]"
 href={m.conversationId ? `/mesajlar?conversation=${m.conversationId}` : `/mesajlar?user=${m.otherUserId}`}
 >
 <strong>{m.otherUserName}</strong>{' '}
 <span className="text-[#7A6B58]">@{m.otherUsername || 'uye'}</span>
 </a>
 ))
 )}
 </div>
 </section>
 </div>
 </div>
 );
}
