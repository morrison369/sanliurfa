import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import { extractMyActivity, renderMyActivityLog } from '../lib/my-activity-log';

type ActivityRoot = HTMLElement & { dataset: DOMStringMap };

async function renderActivityRoot(root: ActivityRoot) {
  const loading = root.querySelector<HTMLElement>('[data-activity-loading]');
  const content = root.querySelector<HTMLElement>('[data-activity-content]');
  if (!loading || !content) return;

  try {
    const response = await fetch('/api/activity?limit=50');
    if (!response.ok) {
      throw new Error('Etkinlik geçmişi yüklenemedi');
    }

    const activities = extractMyActivity(await response.json());
    setElementHtml(content, renderMyActivityLog(activities, null));
  } catch (error) {
    setElementHtml(
      content,
      renderMyActivityLog([], error instanceof Error ? error.message : 'Etkinlik geçmişi yüklenemedi'),
    );
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

export function initMyActivityLog() {
  const roots = Array.from(document.querySelectorAll<ActivityRoot>('[data-my-activity-log]'));
  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    void renderActivityRoot(root);
  }
}
