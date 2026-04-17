import { extractEnvelopeMessage, resolveNestedEnvelopeData } from './api-envelope';
import { renderEmptyState, renderErrorState, renderLoadingState } from './render-states';
import { UI_COPY_TR } from './ui-copy';

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

export function extractUserPublicProfile(payload: unknown): UserPublicProfileData | null {
  const data = resolveNestedEnvelopeData(payload);
  if (!data || typeof data.id !== 'string') return null;
  return data as unknown as UserPublicProfileData;
}

export function extractUserPublicProfileFollowStatus(payload: unknown): boolean {
  const data = resolveNestedEnvelopeData(payload);
  return Boolean(data.is_following);
}

export function extractUserPublicProfileBlockedStatus(payload: unknown): boolean {
  const data = resolveNestedEnvelopeData(payload);
  return Boolean(data.blocked_user);
}

export function extractUserPublicProfileMessage(payload: unknown, fallback: string): string {
  return extractEnvelopeMessage(payload, fallback);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function renderError(message: string): string {
  return renderErrorState(message);
}

function formatActivityType(type: string): string {
  const normalized = type.trim().toLowerCase();

  if (normalized === 'review') return 'Değerlendirme';
  if (normalized === 'comment') return 'Yorum';
  if (normalized === 'favorite') return 'Favori';
  if (normalized === 'follow') return 'Takip';
  if (normalized === 'badge') return 'Rozet';
  if (normalized === 'checkin') return 'Ziyaret';
  if (normalized === 'message') return 'Mesaj';
  if (normalized === 'mention') return 'Bahsedilme';
  if (normalized === 'level_up') return 'Seviye atlama';
  if (normalized === 'loyalty_points') return 'Puan kazanımı';

  return type;
}

function renderActivity(activity: UserPublicProfileActivity[]): string {
  if (activity.length === 0) {
    return renderEmptyState('Henüz görünür etkinlik bulunmuyor.', 'text-sm text-gray-500');
  }

  return `
    <div class="space-y-2">
      ${activity
        .map(
          (item) => `
            <div class="rounded-lg border border-gray-200 bg-white p-3">
              <div class="flex items-center justify-between gap-3">
                <span class="text-xs font-medium uppercase tracking-wide text-gray-500">${formatActivityType(item.type)}</span>
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
    return renderLoadingState(UI_COPY_TR.profile.loading, 'py-12 text-center text-gray-500');
  }

  if (state.error) {
    return renderError(state.error);
  }

  if (!state.profile) {
    return renderEmptyState('Kullanıcı profili bulunamadı.', 'py-12 text-center text-gray-500');
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
              <div><p class="text-2xl font-bold">${profile.stats.followers}</p><p class="text-sm">Takipçiler</p></div>
              <div><p class="text-2xl font-bold">${profile.stats.following}</p><p class="text-sm">Takip edilenler</p></div>
            </div>
            ${canInteract ? `
              <div class="flex gap-2">
                ${profile.allow_messages !== false ? `
                  <a href="/mesajlar" class="inline-block rounded bg-blue-500 px-4 py-2 text-white">Mesaj gönder</a>
                ` : ''}
                <button type="button" data-user-public-profile-follow class="rounded px-4 py-2 text-white ${state.isFollowing ? 'bg-gray-600 hover:bg-gray-700' : 'bg-green-600 hover:bg-green-700'}" ${state.isFollowingLoading ? 'disabled' : ''}>
                  ${state.isFollowingLoading ? UI_COPY_TR.common.processing : state.isFollowing ? 'Takibi bırak' : 'Takip et'}
                </button>
                <button type="button" data-user-public-profile-block class="rounded px-4 py-2 text-white ${state.isBlocked ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-red-600 hover:bg-red-700'}" ${state.isBlocking ? 'disabled' : ''}>
                  ${state.isBlocking ? UI_COPY_TR.common.processing : state.isBlocked ? 'Engeli kaldır' : 'Engelle'}
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
