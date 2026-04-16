import { fetchAdminAnalytics } from '../lib/admin-browser-client';
import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  extractAdminAnalyticsDashboardData,
  renderAdminAnalyticsDashboard,
  type AdminAnalyticsDashboardData,
} from '../lib/admin-analytics-dashboard';

type AdminAnalyticsRoot = HTMLElement & { dataset: DOMStringMap };

function readDays(root: AdminAnalyticsRoot): number {
  const days = Number(root.dataset.days || '30');
  return days === 7 || days === 90 || days === 365 ? days : 30;
}

function readData(root: AdminAnalyticsRoot): AdminAnalyticsDashboardData | null {
  const raw = root.dataset.adminAnalyticsData;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AdminAnalyticsDashboardData;
  } catch {
    return null;
  }
}

function writeData(root: AdminAnalyticsRoot, data: AdminAnalyticsDashboardData | null) {
  if (!data) {
    delete root.dataset.adminAnalyticsData;
    return;
  }

  root.dataset.adminAnalyticsData = JSON.stringify(data);
}

function setError(root: AdminAnalyticsRoot, message: string | null) {
  if (message) root.dataset.error = message;
  else delete root.dataset.error;
}

async function fetchAnalytics(root: AdminAnalyticsRoot) {
  const payload = await fetchAdminAnalytics(readDays(root), 10);
  const data = extractAdminAnalyticsDashboardData(payload);
  if (!data) {
    throw new Error('Analitikler yüklenirken bir hata oluştu');
  }

  writeData(root, data);
  setError(root, null);
}

function bindInteractions(root: AdminAnalyticsRoot, content: HTMLElement) {
  const buttons = Array.from(content.querySelectorAll<HTMLElement>('[data-analytics-panel-days]'));

  for (const button of buttons) {
    button.addEventListener('click', async () => {
      const nextDays = Number(button.dataset.analyticsPanelDays || '30');
      if (nextDays !== 7 && nextDays !== 30 && nextDays !== 90 && nextDays !== 365) return;

      root.dataset.days = String(nextDays);
      delete root.dataset.adminAnalyticsData;
      delete root.dataset.error;
      await renderRoot(root);
    });
  }
}

async function renderRoot(root: AdminAnalyticsRoot) {
  const loading = root.querySelector<HTMLElement>('[data-admin-analytics-loading]');
  const content = root.querySelector<HTMLElement>('[data-admin-analytics-content]');
  if (!loading || !content) return;

  setElementClassName(loading, 'flex items-center justify-center p-8');
  setElementClassName(content, 'hidden');

  try {
    if (!root.dataset.adminAnalyticsData && !root.dataset.error) {
      await fetchAnalytics(root);
    }

    setElementHtml(
      content,
      renderAdminAnalyticsDashboard({
        days: readDays(root),
        data: readData(root),
        error: root.dataset.error || null,
      }),
    );
    bindInteractions(root, content);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'Analitikler yüklenirken bir hata oluştu');
    setElementHtml(
      content,
      renderAdminAnalyticsDashboard({
        days: readDays(root),
        data: null,
        error: root.dataset.error || 'Analitikler yüklenirken bir hata oluştu',
      }),
    );
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

export function initAdminAnalyticsDashboard() {
  const roots = Array.from(document.querySelectorAll<AdminAnalyticsRoot>('[data-admin-analytics-dashboard]'));

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    if (!root.dataset.days) root.dataset.days = '30';
    void renderRoot(root);
  }
}
