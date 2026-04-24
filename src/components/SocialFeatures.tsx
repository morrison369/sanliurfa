import { useEffect, useMemo, useState } from 'react';
import { realtimeManager } from '../lib/realtime/realtime-sse';

type TabKey = 'overview' | 'feed' | 'network' | 'matches' | 'places';
type ToastType = 'success' | 'error' | 'info';

interface SocialCapabilities {
  features?: {
    openAccess?: boolean;
    tinderEnabled?: boolean;
    autoConversationOnMatch?: boolean;
    dailySwipeLimit?: number;
  };
  quota?: {
    dailyLimit: number;
    usedToday: number;
    remaining: number;
  };
}

interface PlaceItem {
  id: string;
  slug: string;
  name: string;
  category?: string;
}

interface UserSearchItem {
  id: string;
  full_name?: string;
  username?: string;
  level?: number;
  points?: number;
}

interface SuggestedUserItem {
  id: string;
  name?: string;
  username?: string;
  activityCount?: number;
  matchingInterests?: number;
}

interface SubscriptionTierItem {
  id: string;
  name?: string;
  price_monthly?: number;
  price_annual?: number;
}

interface UserSubscriptionSummary {
  hasActiveSubscription: boolean;
  subscription: {
    status?: string;
    tier?: {
      id?: string;
      name?: string;
    };
  } | null;
}

export function SocialFeatures() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: ToastType; text: string } | null>(null);

  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [trendingTags, setTrendingTags] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [capabilities, setCapabilities] = useState<SocialCapabilities | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversationCount, setConversationCount] = useState(0);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUserItem[]>([]);
  const [subscriptionSummary, setSubscriptionSummary] = useState<UserSubscriptionSummary | null>(null);
  const [subscriptionTiers, setSubscriptionTiers] = useState<SubscriptionTierItem[]>([]);

  const [followUserIdInput, setFollowUserIdInput] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userSearchResults, setUserSearchResults] = useState<UserSearchItem[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');
  const [reviewTitle, setReviewTitle] = useState('');
  const [submissionName, setSubmissionName] = useState('');
  const [submissionCategory, setSubmissionCategory] = useState('restoran');
  const [submissionAddress, setSubmissionAddress] = useState('');
  const [submissionDesc, setSubmissionDesc] = useState('');

  const selectedPlace = useMemo(
    () => places.find((p) => p.id === selectedPlaceId) || null,
    [places, selectedPlaceId]
  );

  function notify(type: ToastType, text: string) {
    setToast({ type, text });
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  async function loadOverview() {
    const [capsRes, unreadRes, convRes, subscriptionRes, tiersRes] = await Promise.all([
      fetch('/api/social/capabilities'),
      fetch('/api/messages/unread-count'),
      fetch('/api/messages?limit=20'),
      fetch('/api/user/subscription'),
      fetch('/api/subscriptions/tiers'),
    ]);

    if (capsRes.ok) {
      const caps = await capsRes.json();
      setCapabilities(caps?.data || null);
    }
    if (unreadRes.ok) {
      const unread = await unreadRes.json();
      setUnreadCount(Number(unread?.data?.count || 0));
    }
    if (convRes.ok) {
      const conv = await convRes.json();
      setConversationCount(Array.isArray(conv?.data) ? conv.data.length : 0);
    }
    if (subscriptionRes.ok) {
      const payload = await subscriptionRes.json();
      const data = payload?.data || {};
      setSubscriptionSummary({
        hasActiveSubscription: Boolean(data?.hasActiveSubscription),
        subscription: data?.subscription || null,
      });
    }
    if (tiersRes.ok) {
      const payload = await tiersRes.json();
      const data = payload?.data || {};
      setSubscriptionTiers(Array.isArray(data?.tiers) ? data.tiers : []);
    }
  }

  async function loadFeed() {
    const [feedRes, trendRes] = await Promise.all([
      fetch('/api/social/feed?limit=20'),
      fetch('/api/social/trending?type=hashtags&limit=20'),
    ]);

    if (feedRes.ok) {
      const feed = await feedRes.json();
      setFeedItems(Array.isArray(feed?.data) ? feed.data : []);
    }
    if (trendRes.ok) {
      const trend = await trendRes.json();
      setTrendingTags(Array.isArray(trend?.data) ? trend.data : []);
    }
  }

  async function loadNetwork() {
    const [followersRes, followingRes, pendingRes, suggestionsRes] = await Promise.all([
      fetch('/api/social/followers?type=followers&limit=50'),
      fetch('/api/social/followers?type=following&limit=50'),
      fetch('/api/social/followers?type=pending'),
      fetch('/api/users/suggestions?limit=12'),
    ]);

    if (followersRes.ok) {
      const data = await followersRes.json();
      setFollowers(Array.isArray(data?.followers) ? data.followers : []);
    }
    if (followingRes.ok) {
      const data = await followingRes.json();
      setFollowing(Array.isArray(data?.following) ? data.following : []);
    }
    if (pendingRes.ok) {
      const data = await pendingRes.json();
      setPendingRequests(Array.isArray(data?.requests) ? data.requests : []);
    }
    if (suggestionsRes.ok) {
      const payload = await suggestionsRes.json();
      const data = payload?.data || {};
      setSuggestedUsers(Array.isArray(data?.suggestions) ? data.suggestions : []);
    }
  }

  async function loadMatches() {
    const res = await fetch('/api/social/matches?limit=30');
    if (!res.ok) return;
    const data = await res.json();
    setMatches(Array.isArray(data?.data) ? data.data : []);
  }

  async function loadPlaces() {
    const res = await fetch('/api/places?limit=30');
    if (!res.ok) return;
    const data = await res.json();
    const rows = Array.isArray(data?.data) ? data.data : [];
    setPlaces(rows);
    if (!selectedPlaceId && rows.length > 0) {
      setSelectedPlaceId(rows[0].id);
    }
  }

  async function loadActiveTabData(tab: TabKey) {
    setLoading(true);
    try {
      if (tab === 'overview') await loadOverview();
      if (tab === 'feed') await loadFeed();
      if (tab === 'network') await loadNetwork();
      if (tab === 'matches') await loadMatches();
      if (tab === 'places') await loadPlaces();
    } catch (error) {
      notify('error', error instanceof Error ? error.message : 'Veri yüklenemedi');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActiveTabData(activeTab);
  }, [activeTab]);

  useEffect(() => {
    realtimeManager.connectToMessages();
    realtimeManager.connectToFeed();

    const unsubUnread = realtimeManager.subscribeToUnreadCount((count) => {
      setUnreadCount(Number(count || 0));
    });

    const unsubFeed = realtimeManager.onFeedUpdate((payload) => {
      if (!payload?.activities?.length) return;
      setFeedItems((prev) => {
        const merged = [...payload.activities, ...prev];
        const seen = new Set<string>();
        return merged
          .filter((item: any) => {
            const key = String(item.id || `${item.user_id}-${item.created_at}`);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .slice(0, 20);
      });
      if (activeTab === 'feed') {
        notify('info', 'Yeni topluluk aktivitesi geldi.');
      }
    });

    const interval = setInterval(() => {
      if (activeTab === 'overview') {
        loadOverview();
      }
      if (activeTab === 'feed') {
        loadFeed();
      }
    }, 30000);

    return () => {
      unsubUnread();
      unsubFeed();
      clearInterval(interval);
    };
  }, [activeTab]);

  async function searchUsers() {
    const q = userSearchQuery.trim();
    if (q.length < 2) {
      notify('error', 'Kullanıcı araması için en az 2 karakter girin.');
      return;
    }

    setUserSearchLoading(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}&limit=10&sortBy=relevance`);
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        notify('error', payload?.error || 'Kullanıcı araması başarısız');
        return;
      }
      setUserSearchResults(Array.isArray(payload?.data) ? payload.data : []);
      if (!payload?.data?.length) {
        notify('info', 'Eşleşen kullanıcı bulunamadı.');
      }
    } finally {
      setUserSearchLoading(false);
    }
  }

  async function followUserById(action: 'follow' | 'unfollow', userId?: string) {
    const target = (userId || followUserIdInput).trim();
    if (!target) {
      notify('error', 'Lütfen geçerli bir kullanıcı ID girin.');
      return;
    }

    const res = await fetch('/api/social/follow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: target, action }),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      notify('error', payload?.error || 'Takip işlemi başarısız');
      return;
    }
    notify('success', action === 'follow' ? 'Takip işlemi başarılı.' : 'Takipten çıkıldı.');
    await loadNetwork();
  }

  async function handlePendingRequest(requestId: string, action: 'accept' | 'decline') {
    const res = await fetch('/api/social/followers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, action }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      notify('error', payload?.error || 'İstek işlenemedi');
      return;
    }
    notify('success', action === 'accept' ? 'Takip isteği kabul edildi.' : 'Takip isteği reddedildi.');
    await loadNetwork();
  }

  async function startConversation(recipientId: string, conversationId?: string) {
    if (conversationId) {
      window.location.href = `/mesajlar?conversation=${conversationId}`;
      return;
    }

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_id: recipientId }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      notify('error', payload?.error || 'Sohbet başlatılamadı');
      return;
    }
    const convoId = payload?.data?.id;
    if (convoId) {
      window.location.href = `/mesajlar?conversation=${convoId}`;
      return;
    }
    window.location.href = `/mesajlar?recipientId=${encodeURIComponent(recipientId)}`;
  }

  async function likePlace(action: 'like' | 'unlike') {
    if (!selectedPlaceId) return;
    const res = await fetch(`/api/places/${selectedPlaceId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      notify('error', payload?.error || 'Beğeni işlemi başarısız');
      return;
    }
    notify(
      'success',
      action === 'like'
        ? `Mekan beğenildi. Toplam beğeni: ${payload?.data?.count ?? '-'}`
        : `Beğeni geri alındı. Toplam beğeni: ${payload?.data?.count ?? '-'}`
    );
  }

  async function sharePlace(platform: string) {
    if (!selectedPlaceId) return;
    const shareUrl = `${window.location.origin}/isletme/${selectedPlace?.slug || selectedPlaceId}`;
    const res = await fetch(`/api/places/${selectedPlaceId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, share_url: shareUrl }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      notify('error', payload?.error || 'Paylaşım kaydı başarısız');
      return;
    }
    notify('success', `Paylaşım kaydedildi. Toplam paylaşım: ${payload?.data?.count ?? '-'}`);
  }

  async function submitReview() {
    if (!selectedPlaceId || !reviewContent.trim()) {
      notify('error', 'Yorum göndermek için mekan ve içerik zorunludur.');
      return;
    }
    const res = await fetch('/api/reviews/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        place_id: selectedPlaceId,
        rating: reviewRating,
        title: reviewTitle.trim(),
        content: reviewContent.trim(),
      }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      notify('error', payload?.error || 'Yorum gönderilemedi');
      return;
    }
    notify('success', `Yorum kaydedildi. Kazanılan puan: ${payload?.pointsEarned ?? 0}`);
    setReviewContent('');
    setReviewTitle('');
  }

  async function submitPlaceSuggestion() {
    if (!submissionName.trim() || !submissionAddress.trim() || !submissionDesc.trim()) {
      notify('error', 'Mekan önerisi için ad, adres ve açıklama zorunludur.');
      return;
    }
    const res = await fetch('/api/places/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'submit',
        name: submissionName.trim(),
        category: submissionCategory,
        description: submissionDesc.trim(),
        address: submissionAddress.trim(),
      }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      notify('error', payload?.error || 'Mekan önerisi gönderilemedi');
      return;
    }
    if (payload?.warning) {
      notify('info', payload.warning);
      return;
    }
    notify('success', payload?.message || 'Mekan öneriniz incelemeye alındı.');
    setSubmissionName('');
    setSubmissionAddress('');
    setSubmissionDesc('');
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : toast.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-900'
                : 'border-blue-200 bg-blue-50 text-blue-900'
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {[
          { key: 'overview', label: 'Genel Durum' },
          { key: 'feed', label: 'Akış & Trend' },
          { key: 'network', label: 'Takip Ağı' },
          { key: 'matches', label: 'Eşleşmeler' },
          { key: 'places', label: 'Mekan Etkileşimi' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as TabKey)}
            className={`rounded-lg px-3 py-2 text-sm ${
              activeTab === tab.key
                ? 'bg-amber-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-sm text-gray-500">Yükleniyor...</div>}

      {!loading && activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Okunmamış Mesaj</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{unreadCount}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Konuşma Sayısı</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{conversationCount}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Günlük Swipe</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {capabilities?.quota ? `${capabilities.quota.usedToday}/${capabilities.quota.dailyLimit}` : '-'}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Kalan Swipe</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {capabilities?.quota?.remaining ?? '-'}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Abonelik</p>
              <p className="mt-1 text-lg font-bold text-gray-900">
                {subscriptionSummary?.hasActiveSubscription
                  ? subscriptionSummary?.subscription?.tier?.name || 'Aktif'
                  : 'Faz 1 Ücretsiz'}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Plan Sayısı</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{subscriptionTiers.length}</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Üyelik ve Erişim Özeti</h3>
              <a href="/fiyatlandirma" className="text-sm font-medium text-amber-700 hover:text-amber-800">
                Üyelik planları
              </a>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Sosyal özellikler Faz 1 döneminde açık erişimdedir. Ücretli planlar hazır tutulur, yükseltme
              akışı daha sonra devreye alınır.
            </p>
            {subscriptionTiers.length > 0 && (
              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {subscriptionTiers.slice(0, 6).map((tier) => (
                  <div key={tier.id || tier.name} className="rounded-lg border border-gray-100 p-3">
                    <p className="text-sm font-semibold text-gray-900">{tier.name || 'Plan'}</p>
                    <p className="text-xs text-gray-500">
                      Aylık: {tier.price_monthly ?? 0} TL | Yıllık: {tier.price_annual ?? 0} TL
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && activeTab === 'feed' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-base font-semibold text-gray-900">Aktivite Akışı</h3>
            <div className="mt-3 space-y-2">
              {feedItems.length === 0 ? (
                <p className="text-sm text-gray-500">Aktivite bulunamadı.</p>
              ) : (
                feedItems.map((item: any) => (
                  <div key={item.id} className="rounded-lg border border-gray-100 p-3">
                    <p className="text-sm font-medium text-gray-900">{item.object_title || item.activity_type}</p>
                    <p className="text-xs text-gray-500">{item.activity_type}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-base font-semibold text-gray-900">Trend Etiketler</h3>
            <div className="mt-3 space-y-2">
              {trendingTags.length === 0 ? (
                <p className="text-sm text-gray-500">Trend etiketi bulunamadı.</p>
              ) : (
                trendingTags.map((item: any) => (
                  <div key={item.id || item.tag_slug} className="rounded-lg border border-gray-100 p-3">
                    <p className="text-sm font-medium text-gray-900">#{item.tag_name}</p>
                    <p className="text-xs text-gray-500">{item.usage_count || 0} kullanım</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && activeTab === 'network' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-base font-semibold text-gray-900">Kullanıcı Ara (isim / username)</h3>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Örn: mehmet, urfali_ali"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                onClick={searchUsers}
                disabled={userSearchLoading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {userSearchLoading ? 'Aranıyor...' : 'Ara'}
              </button>
            </div>
            {userSearchResults.length > 0 && (
              <div className="mt-3 space-y-2">
                {userSearchResults.map((u) => (
                  <div key={u.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{u.full_name || 'Kullanıcı'}</p>
                      <p className="text-xs text-gray-500">@{u.username || 'uye'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => followUserById('follow', u.id)}
                        className="rounded bg-amber-600 px-2 py-1 text-xs text-white"
                      >
                        Takip Et
                      </button>
                      <button
                        onClick={() => startConversation(u.id)}
                        className="rounded bg-emerald-600 px-2 py-1 text-xs text-white"
                      >
                        Mesaj
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-base font-semibold text-gray-900">Kullanıcı ID ile Takip İşlemi</h3>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={followUserIdInput}
                onChange={(e) => setFollowUserIdInput(e.target.value)}
                placeholder="Kullanıcı ID"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                onClick={() => followUserById('follow')}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                Takip Et
              </button>
              <button
                onClick={() => followUserById('unfollow')}
                className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
              >
                Takipten Çık
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h4 className="font-semibold text-gray-900">Takipçiler ({followers.length})</h4>
              <div className="mt-2 space-y-2">
                {followers.slice(0, 8).map((u: any) => (
                  <div key={u.id} className="rounded border border-gray-100 p-2">
                    <p className="text-sm font-medium text-gray-900">{u.full_name || 'Kullanıcı'}</p>
                    <p className="text-xs text-gray-500">@{u.username || 'uye'}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h4 className="font-semibold text-gray-900">Takip Edilenler ({following.length})</h4>
              <div className="mt-2 space-y-2">
                {following.slice(0, 8).map((u: any) => (
                  <div key={u.id} className="rounded border border-gray-100 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{u.full_name || 'Kullanıcı'}</p>
                        <p className="text-xs text-gray-500">@{u.username || 'uye'}</p>
                      </div>
                      <button
                        onClick={() => followUserById('unfollow', u.id)}
                        className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-800 hover:bg-gray-200"
                      >
                        Çık
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h4 className="font-semibold text-gray-900">Bekleyen İstekler ({pendingRequests.length})</h4>
              <div className="mt-2 space-y-2">
                {pendingRequests.length === 0 ? (
                  <p className="text-sm text-gray-500">Bekleyen istek yok.</p>
                ) : (
                  pendingRequests.slice(0, 8).map((r: any) => (
                    <div key={r.id} className="rounded border border-gray-100 p-2">
                      <p className="text-sm font-medium text-gray-900">{r.full_name || r.from_user_name || 'İstek'}</p>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => handlePendingRequest(r.id, 'accept')}
                          className="rounded bg-emerald-600 px-2 py-1 text-xs text-white"
                        >
                          Kabul
                        </button>
                        <button
                          onClick={() => handlePendingRequest(r.id, 'decline')}
                          className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-800"
                        >
                          Reddet
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h4 className="font-semibold text-gray-900">Önerilen Üyeler ({suggestedUsers.length})</h4>
            <div className="mt-3 space-y-2">
              {suggestedUsers.length === 0 ? (
                <p className="text-sm text-gray-500">Şu anda öneri bulunmuyor.</p>
              ) : (
                suggestedUsers.slice(0, 10).map((u) => (
                  <div key={u.id} className="flex items-center justify-between rounded border border-gray-100 p-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{u.name || 'Kullanıcı'}</p>
                      <p className="text-xs text-gray-500">
                        @{u.username || 'uye'} | Aktivite: {u.activityCount || 0} | Ortak ilgi:{' '}
                        {u.matchingInterests || 0}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => followUserById('follow', u.id)}
                        className="rounded bg-amber-600 px-2 py-1 text-xs text-white"
                      >
                        Takip Et
                      </button>
                      <button
                        onClick={() => startConversation(u.id)}
                        className="rounded bg-emerald-600 px-2 py-1 text-xs text-white"
                      >
                        Mesaj
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && activeTab === 'matches' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-gray-900">Eşleşen Üyeler</h3>
              <a href="/eslesme" className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white">
                Swipe Ekranına Git
              </a>
            </div>
            <div className="mt-3 space-y-2">
              {matches.length === 0 ? (
                <p className="text-sm text-gray-500">Henüz eşleşme bulunmuyor.</p>
              ) : (
                matches.map((m: any) => (
                  <div key={m.matchId || m.otherUserId} className="rounded-lg border border-gray-100 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{m.otherUserName}</p>
                        <p className="text-xs text-gray-500">@{m.otherUsername || 'uye'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => followUserById('follow', m.otherUserId)}
                          className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800"
                        >
                          Takip Et
                        </button>
                        <button
                          onClick={() => startConversation(m.otherUserId, m.conversationId)}
                          className="rounded bg-emerald-600 px-2 py-1 text-xs text-white"
                        >
                          Mesaj Gönder
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && activeTab === 'places' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-base font-semibold text-gray-900">Mekan Etkileşimi</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <select
                value={selectedPlaceId}
                onChange={(e) => setSelectedPlaceId(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {places.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.category || 'kategori'})
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={() => likePlace('like')}
                  className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white"
                >
                  Beğen
                </button>
                <button
                  onClick={() => likePlace('unlike')}
                  className="rounded-lg bg-gray-200 px-3 py-2 text-sm font-medium text-gray-800"
                >
                  Beğeniyi Kaldır
                </button>
                <button
                  onClick={() => sharePlace('internal')}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white"
                >
                  Paylaş
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-base font-semibold text-gray-900">Yorum Yaz</h3>
            <div className="mt-3 grid gap-2">
              <input
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                placeholder="Yorum başlığı (opsiyonel)"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <label className="text-sm text-gray-700">Puan:</label>
                <select
                  value={reviewRating}
                  onChange={(e) => setReviewRating(Number(e.target.value))}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                value={reviewContent}
                onChange={(e) => setReviewContent(e.target.value)}
                placeholder="Mekan hakkındaki deneyiminizi yazın"
                rows={4}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                onClick={submitReview}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white"
              >
                Yorumu Gönder
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-base font-semibold text-gray-900">Yeni Mekan Öner</h3>
            <div className="mt-3 grid gap-2">
              <input
                value={submissionName}
                onChange={(e) => setSubmissionName(e.target.value)}
                placeholder="Mekan adı"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <select
                value={submissionCategory}
                onChange={(e) => setSubmissionCategory(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="restoran">Restoran</option>
                <option value="kafe">Kafe</option>
                <option value="tarihi-yer">Tarihi Yer</option>
                <option value="otel">Otel</option>
                <option value="aktivite">Aktivite</option>
              </select>
              <input
                value={submissionAddress}
                onChange={(e) => setSubmissionAddress(e.target.value)}
                placeholder="Adres"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <textarea
                value={submissionDesc}
                onChange={(e) => setSubmissionDesc(e.target.value)}
                placeholder="Kısa açıklama"
                rows={3}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                onClick={submitPlaceSuggestion}
                className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white"
              >
                Mekanı İncelemeye Gönder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
