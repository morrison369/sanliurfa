import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  extractUserPublicProfile,
  extractUserPublicProfileBlockedStatus,
  extractUserPublicProfileFollowStatus,
  extractUserPublicProfileMessage,
  renderUserPublicProfile,
  type UserPublicProfileState,
} from '../lib/user-public-profile';

type UserPublicProfileRoot = HTMLElement & { dataset: DOMStringMap };

function readState(root: UserPublicProfileRoot): UserPublicProfileState {
  return {
    profile: null,
    isLoading: root.dataset.loading !== 'false',
    isFollowing: root.dataset.isFollowing === 'true',
    isFollowingLoading: root.dataset.followingLoading === 'true',
    isBlocked: root.dataset.isBlocked === 'true',
    isBlocking: root.dataset.blocking === 'true',
    error: root.dataset.error || null,
    currentUserId: root.dataset.currentUserId || undefined,
  };
}

function setError(root: UserPublicProfileRoot, message: string | null) {
  if (message) root.dataset.error = message;
  else delete root.dataset.error;
}

async function loadProfile(root: UserPublicProfileRoot) {
  const userId = root.dataset.userId;
  const profileResponse = await fetch(`/api/users/${userId}/profile`);
  const profilePayload = await profileResponse.json();
  if (!profileResponse.ok) {
    throw new Error(extractUserPublicProfileMessage(profilePayload, 'Profil yüklenemedi'));
  }

  const profile = extractUserPublicProfile(profilePayload);
  if (!profile) throw new Error('Profil yüklenemedi');

  let isFollowing = Boolean(profile.is_following);
  let isBlocked = false;

  if (root.dataset.currentUserId) {
    const [followResponse, blockResponse] = await Promise.all([
      fetch(`/api/following/check?user_id=${userId}`),
      fetch(`/api/blocking/check?user_id=${userId}`),
    ]);

    const followPayload = await followResponse.json();
    const blockPayload = await blockResponse.json();

    if (followResponse.ok) isFollowing = extractUserPublicProfileFollowStatus(followPayload);
    if (blockResponse.ok) isBlocked = extractUserPublicProfileBlockedStatus(blockPayload);
  }

  return { profile, isFollowing, isBlocked };
}

async function renderRoot(root: UserPublicProfileRoot) {
  const loading = root.querySelector<HTMLElement>('[data-user-public-profile-loading]');
  const content = root.querySelector<HTMLElement>('[data-user-public-profile-content]');
  if (!loading || !content) return;

  try {
    const { profile, isFollowing, isBlocked } = await loadProfile(root);
    root.dataset.loading = 'false';
    root.dataset.isFollowing = String(isFollowing);
    root.dataset.isBlocked = String(isBlocked);
    const state = readState(root);
    state.profile = profile;
    setElementHtml(content, renderUserPublicProfile(state));
    bindActions(root, content);
  } catch (error) {
    root.dataset.loading = 'false';
    setError(root, error instanceof Error ? error.message : 'Profil yüklenemedi');
    const state = readState(root);
    setElementHtml(content, renderUserPublicProfile(state));
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

async function runFollowAction(root: UserPublicProfileRoot) {
  const userId = root.dataset.userId;
  const isFollowing = root.dataset.isFollowing === 'true';
  root.dataset.followingLoading = 'true';
  await renderRoot(root);

  try {
    const response = await fetch(isFollowing ? '/api/following/unfollow' : '/api/following', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followed_id: userId }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(extractUserPublicProfileMessage(payload, 'Takip işlemi başarısız'));
    }
    setError(root, null);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'Takip işlemi başarısız');
  } finally {
    delete root.dataset.followingLoading;
    await renderRoot(root);
  }
}

async function runBlockAction(root: UserPublicProfileRoot) {
  const userId = root.dataset.userId;
  const isBlocked = root.dataset.isBlocked === 'true';
  root.dataset.blocking = 'true';
  await renderRoot(root);

  try {
    const response = await fetch(isBlocked ? `/api/blocking?blocked_id=${userId}` : '/api/blocking', {
      method: isBlocked ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: isBlocked ? undefined : JSON.stringify({ blocked_id: userId }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(extractUserPublicProfileMessage(payload, 'Engelleme işlemi başarısız'));
    }
    setError(root, null);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'Engelleme işlemi başarısız');
  } finally {
    delete root.dataset.blocking;
    await renderRoot(root);
  }
}

function bindActions(root: UserPublicProfileRoot, content: HTMLElement) {
  content.querySelector<HTMLElement>('[data-user-public-profile-follow]')?.addEventListener('click', () => {
    if (root.dataset.followingLoading === 'true') return;
    void runFollowAction(root);
  });

  content.querySelector<HTMLElement>('[data-user-public-profile-block]')?.addEventListener('click', () => {
    if (root.dataset.blocking === 'true') return;
    void runBlockAction(root);
  });
}

export function initUserPublicProfile() {
  const roots = Array.from(document.querySelectorAll<UserPublicProfileRoot>('[data-user-public-profile]'));
  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    root.dataset.loading = 'true';
    void renderRoot(root);
  }
}
