import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  renderUserRecommendations,
  type RecommendedUser,
} from '../lib/user-recommendations';

type RecommendationsRoot = HTMLElement & { dataset: DOMStringMap };

function bindFollowButtons(
  content: HTMLElement,
  users: RecommendedUser[],
  followingIds: Set<string>,
) {
  content.querySelectorAll<HTMLElement>('[data-user-follow]').forEach((button) => {
    button.addEventListener('click', async () => {
      const userId = button.dataset.userFollow;
      if (!userId) return;
      const method = followingIds.has(userId) ? 'DELETE' : 'POST';
      const followResponse = await fetch(`/api/followers/${userId}`, { method });
      if (!followResponse.ok) return;

      if (followingIds.has(userId)) {
        followingIds.delete(userId);
      } else {
        followingIds.add(userId);
      }

      setElementHtml(content, renderUserRecommendations(users, followingIds));
      bindFollowButtons(content, users, followingIds);
    });
  });
}

async function renderRecommendations(root: RecommendationsRoot, followingIds: Set<string>) {
  const loading = root.querySelector<HTMLElement>('[data-user-recommendations-loading]');
  const content = root.querySelector<HTMLElement>('[data-user-recommendations-content]');
  if (!loading || !content) return;

  try {
    const response = await fetch('/api/recommendations/users?limit=6');
    if (!response.ok) throw new Error('Öneriler alınamadı');
    const payload = (await response.json()) as { data?: RecommendedUser[] };
    const users = payload.data || [];

    if (users.length === 0) {
      setElementHtml(content, '');
    } else {
      setElementHtml(content, renderUserRecommendations(users, followingIds));
      bindFollowButtons(content, users, followingIds);
    }
  } catch (error) {
    console.error('Kullanıcı önerileri yüklenemedi:', error);
    setElementHtml(
      content,
      '<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">Öneriler yüklenemedi.</div>',
    );
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

export function initUserRecommendations() {
  const roots = Array.from(
    document.querySelectorAll<RecommendationsRoot>('[data-user-recommendations]'),
  );

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    void renderRecommendations(root, new Set<string>());
  }
}
