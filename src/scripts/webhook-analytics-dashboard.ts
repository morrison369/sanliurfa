import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  extractWebhookAnalyticsMetrics,
  normalizeWebhookAnalyticsTab,
  renderWebhookAnalyticsDashboard,
  type WebhookAnalyticsMetrics,
} from '../lib/webhook-analytics-dashboard';

type WebhookAnalyticsRoot = HTMLElement & { dataset: DOMStringMap };

function readToken(root: WebhookAnalyticsRoot): string {
  return root.dataset.token || '';
}

function readMetrics(root: WebhookAnalyticsRoot): WebhookAnalyticsMetrics | null {
  const raw = root.dataset.metrics;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as WebhookAnalyticsMetrics;
  } catch {
    return null;
  }
}

function writeMetrics(root: WebhookAnalyticsRoot, metrics: WebhookAnalyticsMetrics | null) {
  if (!metrics) {
    delete root.dataset.metrics;
    return;
  }

  root.dataset.metrics = JSON.stringify(metrics);
}

function readTab(root: WebhookAnalyticsRoot) {
  return normalizeWebhookAnalyticsTab(root.dataset.activeTab);
}

function setError(root: WebhookAnalyticsRoot, message: string | null) {
  if (message) root.dataset.error = message;
  else delete root.dataset.error;
}

async function fetchMetrics(root: WebhookAnalyticsRoot) {
  const response = await fetch('/api/webhooks/analytics', {
    headers: readToken(root)
      ? {
          Authorization: `Bearer ${readToken(root)}`,
        }
      : {},
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error((payload && payload.error) || 'Webhook analitikleri yüklenemedi.');
  }

  const metrics = extractWebhookAnalyticsMetrics(payload);
  if (!metrics) {
    throw new Error('Webhook analitikleri yüklenemedi.');
  }

  writeMetrics(root, metrics);
  setError(root, null);
}

function bindInteractions(root: WebhookAnalyticsRoot, content: HTMLElement) {
  const refresh = content.querySelector<HTMLElement>('[data-webhook-analytics-refresh]');
  refresh?.addEventListener('click', async () => {
    delete root.dataset.metrics;
    delete root.dataset.error;
    await renderRoot(root);
  });

  const tabs = Array.from(content.querySelectorAll<HTMLElement>('[data-webhook-analytics-tab]'));
  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      root.dataset.activeTab = normalizeWebhookAnalyticsTab(tab.dataset.webhookAnalyticsTab);
      renderRoot(root);
    });
  }
}

async function renderRoot(root: WebhookAnalyticsRoot) {
  const loading = root.querySelector<HTMLElement>('[data-webhook-analytics-loading]');
  const content = root.querySelector<HTMLElement>('[data-webhook-analytics-content]');
  if (!loading || !content) return;

  setElementClassName(loading, 'text-center py-8 text-gray-500');
  setElementClassName(content, 'hidden');

  try {
    if (!root.dataset.metrics && !root.dataset.error) {
      await fetchMetrics(root);
    }

    setElementHtml(
      content,
      renderWebhookAnalyticsDashboard({
        metrics: readMetrics(root),
        error: root.dataset.error || null,
        activeTab: readTab(root),
      }),
    );
    bindInteractions(root, content);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'Webhook analitikleri yüklenemedi.');
    setElementHtml(
      content,
      renderWebhookAnalyticsDashboard({
        metrics: null,
        error: root.dataset.error || 'Webhook analitikleri yüklenemedi.',
        activeTab: readTab(root),
      }),
    );
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

export function initWebhookAnalyticsDashboard() {
  const roots = Array.from(document.querySelectorAll<WebhookAnalyticsRoot>('[data-webhook-analytics-dashboard]'));

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    if (!root.dataset.activeTab) root.dataset.activeTab = 'overview';
    void renderRoot(root);
    setInterval(() => {
      delete root.dataset.metrics;
      void renderRoot(root);
    }, 30000);
  }
}
