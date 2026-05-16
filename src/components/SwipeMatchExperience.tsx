import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { computeSwipeThreshold } from '../lib/social/swipe-ui';

interface MatchProfile {
 bio: string;
 photos: string[];
 is_discoverable: boolean;
 interests?: string[];
 age_range_min?: number | null;
 age_range_max?: number | null;
 preferred_district?: string | null;
 looking_for?: string | null;
 profile_completeness?: number;
}

const LOOKING_FOR_OPTIONS: Array<{ value: string; label: string }> = [
 { value: '', label: 'Belirtmek istemiyorum' },
 { value: 'arkadaslik', label: 'Arkadaşlık' },
 { value: 'iliskili', label: 'İlişki' },
 { value: 'sohbet', label: 'Sohbet' },
 { value: 'aktivite', label: 'Birlikte aktivite' },
 { value: 'kahve', label: 'Kahve buluşması' },
];

const SUGGESTED_INTERESTS = [
 'göbeklitepe', 'tarih', 'fotoğrafçılık', 'yemek', 'kebap', 'isot',
 'yürüyüş', 'sıra gecesi', 'müzik', 'sinema', 'kitap', 'kahve',
 'spor', 'doğa', 'halfeti', 'harran',
];

const URFA_DISTRICTS = [
 '', 'Merkez', 'Eyyübiye', 'Haliliye', 'Karaköprü', 'Akçakale', 'Birecik',
 'Bozova', 'Ceylanpınar', 'Halfeti', 'Harran', 'Hilvan', 'Siverek',
 'Suruç', 'Viranşehir',
];

interface MatchCandidate {
 userId: string;
 fullName: string;
 username?: string;
 bio?: string;
 photos?: string[];
 score?: number;
 matchReasons?: string[];
 preferredDistrict?: string | null;
 profileCompleteness?: number;
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
 resetAt?: string | null;
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
 const quotaResetLabel = useMemo(() => {
 if (!quota?.resetAt) return '';
 return new Date(quota.resetAt).toLocaleString('tr-TR', {
 day: 'numeric',
 month: 'short',
 hour: '2-digit',
 minute: '2-digit',
 });
 }, [quota?.resetAt]);
 const profileActions = useMemo(() => {
 const actions: string[] = [];
 if (!profile.bio || profile.bio.trim().length < 40) actions.push('Bio alanını en az 40 karakterle güçlendirin.');
 if (!Array.isArray(profile.photos) || profile.photos.length < 2) actions.push('En az 2 yerel profil fotoğrafı ekleyin.');
 if (!Array.isArray(profile.interests) || profile.interests.length < 3) actions.push('En az 3 ilgi alanı seçin.');
 if (!profile.preferred_district) actions.push('Tercih ettiğiniz ilçeyi belirtin.');
 if (!profile.looking_for) actions.push('Ne aradığınızı seçin.');
 return actions;
 }, [profile]);
 const activityIdeas = useMemo(() => {
 if (!topCandidate) return [];
 const reasons = Array.isArray(topCandidate.matchReasons) ? topCandidate.matchReasons : [];
 if (reasons.some((reason) => reason.toLowerCase().includes('kahve'))) return ['Kahve için Balıklıgöl çevresinde kısa bir rota önerin.', 'İlk mesajda sakin bir kafe tercihi sorun.'];
 if (reasons.some((reason) => reason.toLowerCase().includes('tarih') || reason.toLowerCase().includes('göbeklitepe'))) return ['Göbeklitepe veya Harran gezisi üzerine sohbet başlatın.', 'Tarihi mekan favorilerini sorun.'];
 return ['Şanlıurfa’da sevdiği mekanları sorun.', 'Kısa ve güvenli bir gündüz buluşması önerin.'];
 }, [topCandidate]);

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
 interests: Array.isArray(profile.interests) ? profile.interests.slice(0, 12) : [],
 ageRangeMin: typeof profile.age_range_min === 'number' ? profile.age_range_min : null,
 ageRangeMax: typeof profile.age_range_max === 'number' ? profile.age_range_max : null,
 preferredDistrict: profile.preferred_district || null,
 lookingFor: profile.looking_for || null,
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
 {quotaResetLabel && hasQuotaExhausted ? ` · Yenilenme: ${quotaResetLabel}` : ''}
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

 <div className="grid grid-cols-2 gap-2">
 <div>
 <label className="mb-1 block text-xs text-[#7A6B58]">İlçe (tercih)</label>
 <select
 className="w-full rounded-sm border border-[rgba(184,115,51,0.25)] bg-transparent p-2 text-sm text-[#1F1410]"
 value={profile.preferred_district || ''}
 onChange={(e) => setProfile((prev) => ({ ...prev, preferred_district: e.target.value || null }))}
 >
 {URFA_DISTRICTS.map((d) => (
 <option key={d} value={d}>{d || '— Belirtmek istemiyorum —'}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="mb-1 block text-xs text-[#7A6B58]">Aradığım</label>
 <select
 className="w-full rounded-sm border border-[rgba(184,115,51,0.25)] bg-transparent p-2 text-sm text-[#1F1410]"
 value={profile.looking_for || ''}
 onChange={(e) => setProfile((prev) => ({ ...prev, looking_for: e.target.value || null }))}
 >
 {LOOKING_FOR_OPTIONS.map((o) => (
 <option key={o.value} value={o.value}>{o.label}</option>
 ))}
 </select>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-2">
 <div>
 <label className="mb-1 block text-xs text-[#7A6B58]">Yaş aralığı (min)</label>
 <input
 type="number"
 min={18}
 max={99}
 placeholder="18"
 className="w-full rounded-sm border border-[rgba(184,115,51,0.25)] bg-transparent p-2 text-sm text-[#1F1410]"
 value={typeof profile.age_range_min === 'number' ? profile.age_range_min : ''}
 onChange={(e) => {
 const v = e.target.valueAsNumber;
 setProfile((prev) => ({ ...prev, age_range_min: Number.isFinite(v) ? v : null }));
 }}
 />
 </div>
 <div>
 <label className="mb-1 block text-xs text-[#7A6B58]">Yaş aralığı (max)</label>
 <input
 type="number"
 min={18}
 max={99}
 placeholder="99"
 className="w-full rounded-sm border border-[rgba(184,115,51,0.25)] bg-transparent p-2 text-sm text-[#1F1410]"
 value={typeof profile.age_range_max === 'number' ? profile.age_range_max : ''}
 onChange={(e) => {
 const v = e.target.valueAsNumber;
 setProfile((prev) => ({ ...prev, age_range_max: Number.isFinite(v) ? v : null }));
 }}
 />
 </div>
 </div>

 <div>
 <label className="mb-1 block text-xs text-[#7A6B58]">İlgi alanları (en fazla 12, tıkla aç/kapat)</label>
 <div className="flex flex-wrap gap-1.5">
 {SUGGESTED_INTERESTS.map((tag) => {
 const selected = Array.isArray(profile.interests) && profile.interests.includes(tag);
 return (
 <button
 key={tag}
 type="button"
 onClick={() => setProfile((prev) => {
 const current = Array.isArray(prev.interests) ? prev.interests : [];
 const next = selected ? current.filter((t) => t !== tag) : (current.length < 12 ? [...current, tag] : current);
 return { ...prev, interests: next };
 })}
 className={`rounded-full border px-2.5 py-1 text-xs transition ${selected
 ? 'border-urfa-600 bg-urfa-600 text-white'
 : 'border-[rgba(184,115,51,0.25)] text-[#7A6B58] hover:border-urfa-600 hover:text-urfa-600'}`}
 >
 {tag}
 </button>
 );
 })}
 </div>
 </div>

 {typeof profile.profile_completeness === 'number' && (
 <div className="rounded-sm border border-[rgba(184,115,51,0.14)] bg-[rgba(184,115,51,0.04)] p-2">
 <div className="mb-1 flex items-center justify-between text-xs text-[#7A6B58]">
 <span>Profil tamamlanma</span>
 <span className="font-semibold text-[#1F1410]">%{profile.profile_completeness}</span>
 </div>
 <div className="h-1.5 w-full rounded-full bg-[rgba(184,115,51,0.15)]">
 <div className="h-1.5 rounded-full bg-urfa-600 transition-all" style={{ width: `${Math.min(100, profile.profile_completeness)}%` }} />
 </div>
 </div>
 )}
 {profileActions.length > 0 && (
 <div className="rounded-sm border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-[#7A6B58]">
 <p className="mb-2 font-semibold text-[#1F1410]">Profil güçlendirme kontrolü</p>
 <ul className="space-y-1">
 {profileActions.slice(0, 5).map((action) => (
 <li key={action}>• {action}</li>
 ))}
 </ul>
 </div>
 )}

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
 <span className="text-xs">Yükleniyor…</span>
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
 <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center text-sm text-[#7A6B58]">
 <strong className="text-base text-[#1F1410]">Yeni aday kalmadı.</strong>
 <span>İlgi alanlarınızı ve ilçe tercihinizi güncelleyin ya da daha sonra tekrar deneyin.</span>
 <button
 type="button"
 onClick={() => {
 void loadCandidates();
 void loadCapabilities();
 }}
 className="rounded-sm bg-urfa-600 px-3 py-2 text-xs font-semibold text-white hover:bg-urfa-700"
 >
 Adayları yenile
 </button>
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
 <div className="flex items-start justify-between gap-2">
 <div className="min-w-0 flex-1">
 <h3 className="truncate text-lg font-bold text-[#1F1410]">{candidate.fullName}</h3>
 <p className="text-sm text-[#7A6B58]">@{candidate.username || 'uye'}</p>
 </div>
 {typeof candidate.score === 'number' && candidate.score > 0 && (
 <span
 className="shrink-0 rounded-full bg-urfa-600 px-2 py-0.5 text-xs font-semibold text-white"
 title="Uyum puanı"
 >
 %{Math.min(100, Math.round((candidate.score / 130) * 100))}
 </span>
 )}
 </div>
 {Array.isArray(candidate.matchReasons) && candidate.matchReasons.length > 0 && (
 <div className="mt-1.5">
 <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#7A6B58]">Neden bu kişi?</p>
 <div className="flex flex-wrap gap-1">
 {candidate.matchReasons.slice(0, 3).map((reason, idx) => (
 <span
 key={idx}
 className="rounded-full bg-[rgba(184,115,51,0.1)] px-2 py-0.5 text-[10px] text-urfa-700"
 >
 ✓ {reason}
 </span>
 ))}
 </div>
 </div>
 )}
 <p className="mt-2 text-sm text-[#7A6B58]">{candidate.bio || 'Henüz biyografi yok.'}</p>
 {isTop && activityIdeas.length > 0 && (
 <div className="mt-3 rounded-sm bg-[rgba(184,115,51,0.06)] p-2 text-xs text-[#7A6B58]">
 <p className="mb-1 font-semibold text-[#1F1410]">İlk sohbet fikri</p>
 {activityIdeas.map((idea) => (
 <p key={idea}>• {idea}</p>
 ))}
 </div>
 )}
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
 <p className="mt-2 text-xs text-[#7A6B58]">Klavye: ← geç, → beğen{quotaResetLabel ? ` · Kota yenilenme: ${quotaResetLabel}` : ''}</p>
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
 href={m.conversationId ? `/mesajlar?conversation=${m.conversationId}&starter=${encodeURIComponent('Merhaba, eşleştiğimize sevindim. Şanlıurfa’da en sevdiğin mekan neresi?')}` : `/mesajlar?user=${m.otherUserId}&starter=${encodeURIComponent('Merhaba, eşleştiğimize sevindim. Şanlıurfa’da en sevdiğin mekan neresi?')}`}
 >
 <strong>{m.otherUserName}</strong>{' '}
 <span className="text-[#7A6B58]">@{m.otherUsername || 'uye'}</span>
 <span className="mt-1 block text-xs text-[#7A6B58]">Mesaja hazır başlangıç önerisiyle açılır.</span>
 </a>
 ))
 )}
 </div>
 </section>
 </div>
 </div>
 );
}
