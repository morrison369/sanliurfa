import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  formatLiveAnalyticsTime,
  normalizeLiveAnalyticsKpi,
  normalizeLiveAnalyticsMetrics,
  renderLiveAnalyticsDashboard,
  type LiveAnalyticsKpiData,
  type LiveAnalyticsMetricsData,
} from '../lib/live-analytics-dashboard';
import { realtimeManager } from '../lib/realtime-sse';

type LiveAnalyticsRoot = HTMLElement & { dataset: DOMStringMap };

function readMetrics(root: LiveAnalyticsRoot): LiveAnalyticsMetricsData | null {
  const raw = root.dataset.metrics;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as LiveAnalyticsMetricsData;
  } catch {
    return null;
  }
}

function writeMetrics(root: LiveAnalyticsRoot, metrics: LiveAnalyticsMetricsData | null) {
  if (!metrics) {
    delete root.dataset.metrics;
    return;
  }

  root.dataset.metrics = JSON.stringify(metrics);
}

function readKpi(root: LiveAnalyticsRoot): LiveAnalyticsKpiData | null {
  const raw = root.dataset.kpi;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as LiveAnalyticsKpiData;
  } catch {
    return null;
  }
}

function writeKpi(root: LiveAnalyticsRoot, kpi: LiveAnalyticsKpiData | null) {
  if (!kpi) {
    delete root.dataset.kpi;
    return;
  }

  root.dataset.kpi = JSON.stringify(kpi);
}

function isConnected(root: LiveAnalyticsRoot): boolean {
  return root.dataset.connected === 'true';
}

function setConnected(root: LiveAnalyticsRoot, connected: boolean) {
  root.dataset.connected = connected ? 'true' : 'false';
}

function renderRoot(root: LiveAnalyticsRoot) {
  const loading = root.querySelector<HTMLElement>('[data-live-analytics-loading]');
  const content = root.querySelector<HTMLElement>('[data-live-analytics-content]');
  if (!loading || !content) return;

  const metrics = readMetrics(root);
  const kpi = readKpi(root);

  if (!metrics) {
    setElementClassName(loading, 'flex items-center justify-center h-96');
    setElementClassName(content, 'hidden');
    return;
  }

  setElementHtml(
    content,
    renderLiveAnalyticsDashboard({
      metrics,
      kpi,
      connected: isConnected(root),
      lastUpdate: root.dataset.lastUpdate || null,
    }),
  );
  setElementClassName(loading, 'hidden');
  setElementClassName(content, '');
}

function bindRealtime(root: LiveAnalyticsRoot) {
  if (root.dataset.realtimeBound === 'true') return;
  root.dataset.realtimeBound = 'true';

  realtimeManager.connectToAnalytics();
  setConnected(root, true);

  const unsubscribeMetrics = realtimeManager.onAnalyticsMetrics((payload: unknown) => {
    const metrics = normalizeLiveAnalyticsMetrics(payload);
    if (!metrics) return;
    writeMetrics(root, metrics);
    root.dataset.lastUpdate = formatLiveAnalyticsTime();
    setConnected(root, true);
    renderRoot(root);
  });

  const unsubscribeKpi = realtimeManager.onAnalyticsKPI((payload: unknown) => {
    const kpi = normalizeLiveAnalyticsKpi(payload);
    if (!kpi) return;
    writeKpi(root, kpi);
    renderRoot(root);
  });

  if (typeof window !== 'undefined' && root.dataset.cleanupBound !== 'true') {
    root.dataset.cleanupBound = 'true';
    window.addEventListener(
      'pagehide',
      () => {
        unsubscribeMetrics();
        unsubscribeKpi();
      },
      { once: true },
    );
  }
}

export function initLiveAnalyticsDashboard() {
  const roots = Array.from(document.querySelectorAll<LiveAnalyticsRoot>('[data-live-analytics-dashboard]'));

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    bindRealtime(root);
    renderRoot(root);
  }
}
