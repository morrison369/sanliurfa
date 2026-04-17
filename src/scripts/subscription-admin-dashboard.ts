import { fetchAdminSubscriptionAnalytics } from '../lib/admin-browser-client';
import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  extractSubscriptionAdminAnalytics,
  normalizeSubscriptionAdminTab,
  renderSubscriptionAdminDashboard,
  type SubscriptionAdminTab,
} from '../lib/subscription-admin-dashboard';
import type { AdminSubscriptionAnalyticsData } from '../types/admin-api';

type SubscriptionAdminRoot = HTMLElement & { dataset: DOMStringMap };

function readTab(root: SubscriptionAdminRoot): SubscriptionAdminTab {
  return normalizeSubscriptionAdminTab(root.dataset.activeTab);
}

function writeAnalytics(root: SubscriptionAdminRoot, analytics: AdminSubscriptionAnalyticsData | null) {
  if (!analytics) {
    delete root.dataset.analytics;
    return;
  }
  root.dataset.analytics = JSON.stringify(analytics);
}

function readAnalytics(root: SubscriptionAdminRoot): AdminSubscriptionAnalyticsData | null {
  const raw = root.dataset.analytics;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AdminSubscriptionAnalyticsData;
  } catch {
    return null;
  }
}

function setError(root: SubscriptionAdminRoot, error: string | null) {
  if (error) root.dataset.error = error;
  else delete root.dataset.error;
}

async function fetchAnalytics(root: SubscriptionAdminRoot) {
  const payload = await fetchAdminSubscriptionAnalytics();
  const analytics = extractSubscriptionAdminAnalytics(payload);
  if (!analytics) {
    throw new Error('Abonelik analitiği yüklenemedi');
  }

  writeAnalytics(root, analytics);
  setError(root, null);
}

function bindInteractions(root: SubscriptionAdminRoot, content: HTMLElement) {
  const buttons = Array.from(content.querySelectorAll<HTMLElement>('[data-subscription-admin-tab]'));
  for (const button of buttons) {
    button.addEventListener('click', () => {
      root.dataset.activeTab = normalizeSubscriptionAdminTab(button.dataset.subscriptionAdminTab);
      renderRoot(root);
    });
  }
}

async function renderRoot(root: SubscriptionAdminRoot) {
  const loading = root.querySelector<HTMLElement>('[data-subscription-admin-loading]');
  const content = root.querySelector<HTMLElement>('[data-subscription-admin-content]');
  if (!loading || !content) return;

  setElementClassName(loading, 'space-y-6');
  setElementClassName(content, 'hidden');

  try {
    if (!root.dataset.analytics && !root.dataset.error) {
      await fetchAnalytics(root);
    }

    setElementHtml(
      content,
      renderSubscriptionAdminDashboard({
        analytics: readAnalytics(root),
        error: root.dataset.error || null,
        activeTab: readTab(root),
      }),
    );
    bindInteractions(root, content);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'Abonelik analitiği yüklenemedi');
    setElementHtml(
      content,
      renderSubscriptionAdminDashboard({
        analytics: null,
        error: root.dataset.error || 'Abonelik analitiği yüklenemedi',
        activeTab: readTab(root),
      }),
    );
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

export function initSubscriptionAdminDashboard() {
  const roots = Array.from(
    document.querySelectorAll<SubscriptionAdminRoot>('[data-subscription-admin-dashboard]'),
  );

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    if (!root.dataset.activeTab) root.dataset.activeTab = 'overview';
    void renderRoot(root);
  }
}
