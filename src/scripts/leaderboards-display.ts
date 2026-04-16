import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  getLeaderboardButtonClass,
  leaderboardSortOptions,
  renderLeaderboardUsers,
  type LeaderboardSort,
  type LeaderboardUser,
} from '../lib/leaderboards-ui';

type LeaderboardsRoot = HTMLElement & { dataset: DOMStringMap };

function applySortButtonState(root: LeaderboardsRoot, currentSort: LeaderboardSort) {
  const buttons = root.querySelectorAll<HTMLElement>('[data-sort-by]');
  buttons.forEach((button) => {
    const isActive = button.dataset.sortBy === currentSort;
    setElementClassName(button, getLeaderboardButtonClass(isActive));
  });
}

async function loadLeaderboard(root: LeaderboardsRoot, sortBy: LeaderboardSort) {
  const loading = root.querySelector<HTMLElement>('[data-leaderboards-loading]');
  const content = root.querySelector<HTMLElement>('[data-leaderboards-content]');
  if (!loading || !content) return;

  setElementClassName(loading, 'py-12 text-center text-gray-600 dark:text-gray-300');
  setElementClassName(content, 'hidden space-y-2');
  applySortButtonState(root, sortBy);

  try {
    const response = await fetch(`/api/leaderboards/users?sortBy=${sortBy}&limit=50`);
    if (!response.ok) throw new Error('Failed to load');
    const payload = (await response.json()) as { data?: LeaderboardUser[] };
    setElementHtml(content, renderLeaderboardUsers(payload.data || []));
  } catch (error) {
    console.error('Error loading leaderboard', error);
    setElementHtml(
      content,
      '<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">Liderlik tablosu yüklenemedi.</div>',
    );
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, 'space-y-2');
  }
}

export function initLeaderboardsDisplays() {
  const roots = Array.from(
    document.querySelectorAll<LeaderboardsRoot>('[data-leaderboards-display]'),
  );

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';

    const defaultSort: LeaderboardSort = 'points';
    applySortButtonState(root, defaultSort);

    root.querySelectorAll<HTMLElement>('[data-sort-by]').forEach((button) => {
      button.addEventListener('click', () => {
        const candidate = button.dataset.sortBy as LeaderboardSort;
        if (!leaderboardSortOptions.includes(candidate)) return;
        void loadLeaderboard(root, candidate);
      });
    });

    void loadLeaderboard(root, defaultSort);
  }
}
