export interface UserPublicProfileStats {
  followers: number;
  following: number;
  mutual?: number;
}

export interface UserPublicProfileActivity {
  type: string;
  id: string;
  content: string;
  created_at: string;
}

export interface UserPublicProfileData {
  id: string;
  full_name: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  stats: UserPublicProfileStats;
  is_following?: boolean;
  is_own_profile?: boolean;
  allow_messages?: boolean;
  recent_activity?: UserPublicProfileActivity[];
}

export interface UserPublicProfileState {
  profile: UserPublicProfileData | null;
  isLoading: boolean;
  isFollowing: boolean;
  isFollowingLoading: boolean;
  isBlocked: boolean;
  isBlocking: boolean;
  error: string | null;
  currentUserId?: string;
}

function resolveEnvelopeData(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return {};
  const outerData = 'data' in payload ? (payload as { data?: unknown }).data : undefined;
  if (outerData && typeof outerData === 'object') {
    const nestedData = 'data' in outerData ? (outerData as { data?: unknown }).data : undefined;
    if (nestedData && typeof nestedData === 'object') return nestedData as Record<string, unknown>;
    return outerData as Record<string, unknown>;
  }
  return payload as Record<string, unknown>;
}

export function extractUserPublicProfile(payload: unknown): UserPublicProfileData | null {
  const data = resolveEnvelopeData(payload);
  if (!data || typeof data.id !== 'string') return null;
  return data as unknown as UserPublicProfileData;
}

export function extractUserPublicProfileFollowStatus(payload: unknown): boolean {
  const data = resolveEnvelopeData(payload);
  return Boolean(data.is_following);
}

export function extractUserPublicProfileBlockedStatus(payload: unknown): boolean {
  const data = resolveEnvelopeData(payload);
  return Boolean(data.blocked_user);
}

export function extractUserPublicProfileMessage(payload: unknown, fallback: string): string {
  const data = resolveEnvelopeData(payload);
  if (typeof data.message === 'string' && data.message.trim()) return data.message;
  if (payload && typeof payload === 'object') {
    const error = 'error' in payload ? (payload as { error?: unknown }).error : undefined;
    if (typeof error === 'string' && error.trim()) return error;
    if (error && typeof error === 'object') {
      const message = 'message' in error ? (error as { message?: unknown }).message : undefined;
      if (typeof message === 'string' && message.trim()) return message;
    }
  }
  return fallback;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function renderError(message: string): string {
  return `
    <div class="rounded border border-red-300 bg-red-100 px-4 py-3 text-red-700">
      ${message}
    </div>
  `;
}

function renderActivity(activity: UserPublicProfileActivity[]): string {
  if (activity.length === 0) {
    return '<p class="text-sm text-gray-500">Henüz etkinlik bulunmuyor.</p>';
  }

  return `
    <div class="space-y-2">
      ${activity
        .map(
          (item) => `
            <div class="rounded-lg border border-gray-200 bg-white p-3">
              <div class="flex items-center justify-between gap-3">
                <span class="text-xs font-medium uppercase tracking-wide text-gray-500">${item.type}</span>
                <span class="text-xs text-gray-500">${formatDate(item.created_at)}</span>
              </div>
              <p class="mt-2 text-sm text-gray-700">${item.content}</p>
            </div>
          `,
        )
        .join('')}
    </div>
  `;
}

export function renderUserPublicProfile(state: UserPublicProfileState): string {
  if (state.isLoading) {
    return '<div class="py-12 text-center text-gray-500">Profil yükleniyor...</div>';
  }

  if (state.error) {
    return renderError(state.error);
  }

  if (!state.profile) {
    return '<div class="py-12 text-center text-gray-500">Profil bulunamadı.</div>';
  }

  const profile = state.profile;
  const canInteract = Boolean(state.currentUserId) && !profile.is_own_profile;
  const initial = profile.full_name?.charAt(0) || '?';

  return `
    <div class="space-y-6">
      <div class="rounded-lg border border-gray-200 bg-white p-6">
        <div class="flex items-start gap-6">
          <div class="flex h-24 w-24 items-center justify-center rounded-full bg-gray-300 text-3xl font-bold">${initial}</div>
          <div class="flex-1">
            <h1 class="mb-2 text-3xl font-bold">${profile.full_name}</h1>
            ${profile.bio ? `<p class="mb-4 text-gray-600">${profile.bio}</p>` : ''}
            <div class="mb-4 flex gap-4">
              <div><p class="text-2xl font-bold">${profile.stats.followers}</p><p class="text-sm">Takipçi sayısı</p></div>
              <div><p class="text-2xl font-bold">${profile.stats.following}</p><p class="text-sm">Takip edilen kişi</p></div>
            </div>
            ${canInteract ? `
              <div class="flex gap-2">
                ${profile.allow_messages !== false ? `
                  <a href="/mesajlar" class="inline-block rounded bg-blue-500 px-4 py-2 text-white">Mesaj gönder</a>
                ` : ''}
                <button type="button" data-user-public-profile-follow class="rounded px-4 py-2 text-white ${state.isFollowing ? 'bg-gray-600 hover:bg-gray-700' : 'bg-green-600 hover:bg-green-700'}" ${state.isFollowingLoading ? 'disabled' : ''}>
                  ${state.isFollowingLoading ? 'İşleniyor...' : state.isFollowing ? 'Takipten çık' : 'Takip et'}
                </button>
                <button type="button" data-user-public-profile-block class="rounded px-4 py-2 text-white ${state.isBlocked ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-red-600 hover:bg-red-700'}" ${state.isBlocking ? 'disabled' : ''}>
                  ${state.isBlocking ? 'İşleniyor...' : state.isBlocked ? 'Engellemeyi kaldır' : 'Engelle'}
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
      <div class="space-y-3">
        <h2 class="text-xl font-bold">Son etkinlikler</h2>
        ${renderActivity(profile.recent_activity ?? [])}
      </div>
    </div>
  `;
}
