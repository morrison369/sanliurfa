import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  extractBusinessAnalyticsData,
  extractBusinessInsights,
  extractBusinessMessage,
  renderBusinessAnalyticsDashboard,
  type BusinessAnalyticsData,
  type Insight,
} from '../lib/business-analytics-dashboard';

type BusinessAnalyticsRoot = HTMLElement & { dataset: DOMStringMap };
const BUSINESS_ANALYTICS_DAYS_KEY = 'sanliurfa:business-analytics:days';

function readData(root: BusinessAnalyticsRoot): BusinessAnalyticsData | null {
  const raw = root.dataset.analyticsData;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as BusinessAnalyticsData;
  } catch {
    return null;
  }
}

function writeData(root: BusinessAnalyticsRoot, data: BusinessAnalyticsData | null) {
  if (!data) {
    delete root.dataset.analyticsData;
    return;
  }

  root.dataset.analyticsData = JSON.stringify(data);
}

function readInsights(root: BusinessAnalyticsRoot): Insight[] {
  const raw = root.dataset.insights;
  if (!raw) return [];

  try {
    return JSON.parse(raw) as Insight[];
  } catch {
    return [];
  }
}

function writeInsights(root: BusinessAnalyticsRoot, insights: Insight[]) {
  root.dataset.insights = JSON.stringify(insights);
}

function readDays(root: BusinessAnalyticsRoot): number {
  const raw = Number(root.dataset.days || '30');
  return raw === 7 || raw === 90 ? raw : 30;
}

function readStoredDays(root: BusinessAnalyticsRoot): number {
  try {
    const placeId = readPlaceId(root);
    const raw = window.localStorage.getItem(`${BUSINESS_ANALYTICS_DAYS_KEY}:${placeId || 'global'}`);
    const days = Number(raw || '30');
    return days === 7 || days === 90 ? days : 30;
  } catch {
    return 30;
  }
}

function writeStoredDays(root: BusinessAnalyticsRoot, days: number) {
  try {
    const placeId = readPlaceId(root);
    window.localStorage.setItem(`${BUSINESS_ANALYTICS_DAYS_KEY}:${placeId || 'global'}`, String(days));
  } catch {
    // no-op
  }
}

function readPlaceId(root: BusinessAnalyticsRoot): string {
  if (root.dataset.placeId) return root.dataset.placeId;

  const params = new URLSearchParams(window.location.search);
  return params.get('placeId') || '';
}

function setError(root: BusinessAnalyticsRoot, message: string | null) {
  if (message) {
    root.dataset.error = message;
  } else {
    delete root.dataset.error;
  }
}

async function fetchDashboard(root: BusinessAnalyticsRoot) {
  const placeId = readPlaceId(root);
  if (!placeId) return;

  const days = readDays(root);
  const [analyticsResponse, insightsResponse] = await Promise.all([
    fetch(`/api/business/analytics?placeId=${encodeURIComponent(placeId)}&days=${days}`),
    fetch(`/api/business/insights?placeId=${encodeURIComponent(placeId)}&limit=10`),
  ]);

  const analyticsPayload = await analyticsResponse.json();
  const insightsPayload = await insightsResponse.json();

  if (!analyticsResponse.ok) {
    throw new Error(extractBusinessMessage(analyticsPayload, 'Analitik verisi alınamadı'));
  }

  if (!insightsResponse.ok) {
    throw new Error(extractBusinessMessage(insightsPayload, 'AI önerileri alınamadı'));
  }

  const data = extractBusinessAnalyticsData(analyticsPayload);
  if (!data) {
    throw new Error('Analitik verisi alınamadı');
  }

  writeData(root, data);
  writeInsights(root, extractBusinessInsights(insightsPayload));
  setError(root, null);
}

async function acknowledgeInsight(root: BusinessAnalyticsRoot, insightId: string) {
  const placeId = readPlaceId(root);
  if (!placeId) return;

  const response = await fetch('/api/business/insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      placeId,
      insightId,
      action: 'acknowledge',
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(extractBusinessMessage(payload, 'AI önerisi güncellenemedi'));
  }

  writeInsights(
    root,
    readInsights(root).filter((item) => item.id !== insightId),
  );
}

function bindInteractions(root: BusinessAnalyticsRoot, content: HTMLElement) {
  const dayButtons = Array.from(
    content.querySelectorAll<HTMLElement>('[data-business-analytics-days]'),
  );

  for (const button of dayButtons) {
    button.addEventListener('click', async () => {
      const days = Number(button.dataset.businessAnalyticsDays || '30');
      if (days !== 7 && days !== 30 && days !== 90) return;

      root.dataset.days = String(days);
      writeStoredDays(root, days);
      delete root.dataset.analyticsData;
      delete root.dataset.error;
      await renderRoot(root);
    });
  }

  const acknowledgeButtons = Array.from(
    content.querySelectorAll<HTMLElement>('[data-business-analytics-acknowledge]'),
  );

  for (const button of acknowledgeButtons) {
    button.addEventListener('click', async () => {
      const insightId = button.dataset.businessAnalyticsAcknowledge;
      if (!insightId) return;

      try {
        await acknowledgeInsight(root, insightId);
        await renderRoot(root);
      } catch (error) {
        setError(root, error instanceof Error ? error.message : 'AI önerisi güncellenemedi');
        await renderRoot(root);
      }
    });
  }
}

async function renderRoot(root: BusinessAnalyticsRoot) {
  const loading = root.querySelector<HTMLElement>('[data-business-analytics-loading]');
  const content = root.querySelector<HTMLElement>('[data-business-analytics-content]');
  if (!loading || !content) return;

  setElementClassName(loading, 'space-y-4');
  setElementClassName(content, 'hidden');

  try {
    if (!root.dataset.analyticsData && !root.dataset.error && readPlaceId(root)) {
      await fetchDashboard(root);
    }

    setElementHtml(
      content,
      renderBusinessAnalyticsDashboard({
        placeId: readPlaceId(root),
        days: readDays(root),
        data: readData(root),
        insights: readInsights(root),
        error: root.dataset.error || null,
      }),
    );
    bindInteractions(root, content);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'Analitik verisi alınamadı');
    setElementHtml(
      content,
      renderBusinessAnalyticsDashboard({
        placeId: readPlaceId(root),
        days: readDays(root),
        data: null,
        insights: [],
        error: root.dataset.error || null,
      }),
    );
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

export function initBusinessAnalyticsDashboard() {
  const roots = Array.from(
    document.querySelectorAll<BusinessAnalyticsRoot>('[data-business-analytics-dashboard]'),
  );

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    if (!root.dataset.days) root.dataset.days = String(readStoredDays(root));
    void renderRoot(root);
  }
}
