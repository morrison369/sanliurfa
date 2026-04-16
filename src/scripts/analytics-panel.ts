import { fetchAdminAnalytics } from '../lib/admin-browser-client';
import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import { extractAnalyticsPanelData, renderAnalyticsPanel, type AnalyticsPanelData } from '../lib/analytics-panel';

type AnalyticsPanelRoot = HTMLElement & { dataset: DOMStringMap };

function readDays(root: AnalyticsPanelRoot): number {
  const days = Number(root.dataset.days || '30');
  return days === 7 || days === 90 || days === 365 ? days : 30;
}

function readData(root: AnalyticsPanelRoot): AnalyticsPanelData | null {
  const raw = root.dataset.analyticsPanelData;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AnalyticsPanelData;
  } catch {
    return null;
  }
}

function writeData(root: AnalyticsPanelRoot, data: AnalyticsPanelData | null) {
  if (!data) {
    delete root.dataset.analyticsPanelData;
    return;
  }

  root.dataset.analyticsPanelData = JSON.stringify(data);
}

function setError(root: AnalyticsPanelRoot, message: string | null) {
  if (message) root.dataset.error = message;
  else delete root.dataset.error;
}

async function fetchAnalytics(root: AnalyticsPanelRoot) {
  const payload = await fetchAdminAnalytics(readDays(root), 10);
  const data = extractAnalyticsPanelData(payload);
  if (!data) {
    throw new Error('Analitik verisi alınamadı');
  }

  writeData(root, data);
  setError(root, null);
}

function bindInteractions(root: AnalyticsPanelRoot, content: HTMLElement) {
  const buttons = Array.from(content.querySelectorAll<HTMLElement>('[data-analytics-panel-days]'));

  for (const button of buttons) {
    button.addEventListener('click', async () => {
      const nextDays = Number(button.dataset.analyticsPanelDays || '30');
      if (nextDays !== 7 && nextDays !== 30 && nextDays !== 90 && nextDays !== 365) return;

      root.dataset.days = String(nextDays);
      delete root.dataset.analyticsPanelData;
      delete root.dataset.error;
      await renderRoot(root);
    });
  }
}

async function renderRoot(root: AnalyticsPanelRoot) {
  const loading = root.querySelector<HTMLElement>('[data-analytics-panel-loading]');
  const content = root.querySelector<HTMLElement>('[data-analytics-panel-content]');
  if (!loading || !content) return;

  setElementClassName(loading, 'flex items-center justify-center p-8');
  setElementClassName(content, 'hidden');

  try {
    if (!root.dataset.analyticsPanelData && !root.dataset.error) {
      await fetchAnalytics(root);
    }

    setElementHtml(
      content,
      renderAnalyticsPanel({
        days: readDays(root),
        data: readData(root),
        error: root.dataset.error || null,
      }),
    );
    bindInteractions(root, content);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'Analitik verisi alınamadı');
    setElementHtml(
      content,
      renderAnalyticsPanel({
        days: readDays(root),
        data: null,
        error: root.dataset.error || 'Analitik verisi alınamadı',
      }),
    );
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

export function initAnalyticsPanel() {
  const roots = Array.from(document.querySelectorAll<AnalyticsPanelRoot>('[data-analytics-panel]'));

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    if (!root.dataset.days) root.dataset.days = '30';
    void renderRoot(root);
  }
}
