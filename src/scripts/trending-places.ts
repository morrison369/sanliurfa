import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import { renderTrendingPlaces, type TrendingPlace } from '../lib/trending-places';

type TrendingRoot = HTMLElement & { dataset: DOMStringMap };

async function loadTrendingPlaces(root: TrendingRoot) {
  const loading = root.querySelector<HTMLElement>('[data-trending-loading]');
  const content = root.querySelector<HTMLElement>('[data-trending-content]');
  if (!loading || !content) return;

  try {
    const response = await fetch('/api/discovery/trending?limit=10');
    if (!response.ok) throw new Error('Trend mekanlar alınamadı');
    const payload = (await response.json()) as { data?: TrendingPlace[] };
    setElementHtml(content, renderTrendingPlaces(payload.data || []));
  } catch (error) {
    console.error('Trend mekanlar alınamadı:', error);
    setElementHtml(
      content,
      '<div class="p-4 text-sm text-red-600 dark:text-red-400">Trend mekanlar yüklenemedi.</div>',
    );
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, 'max-h-96 overflow-y-auto divide-y dark:divide-gray-700');
  }
}

export function initTrendingPlaces() {
  const roots = Array.from(document.querySelectorAll<TrendingRoot>('[data-trending-places]'));

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    void loadTrendingPlaces(root);
  }
}
