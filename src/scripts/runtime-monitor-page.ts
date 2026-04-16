import {
  buildRuntimeDelta,
  buildRuntimeTrend,
  loadHistoryFromStorage,
  persistHistoryToStorage,
  prependHistoryEntry,
  type RuntimeMonitorHistoryEntry as RuntimeHistoryEntry,
  type RuntimeStatus,
} from '../lib/admin-ops-pages';
import {
  applyRuntimeMonitorCoverageLinks,
  buildRuntimeMonitorEndpoints,
  buildRuntimeMonitorSummaryTone,
  runtimeMonitorBadgeStyles,
  type RuntimeMonitorEndpoint,
} from '../lib/runtime-monitor';
import { setLinkHref, setTextContent, setElementClassName } from '../lib/admin-dom';
import { startAutoRefreshPage } from '../lib/admin-page-bootstrap';

const STORAGE_KEY = 'runtime-monitor-history-v1';
const history: RuntimeHistoryEntry[] = [];

async function fetchJson(url: string): Promise<any> {
  const response = await fetch(url, { credentials: 'same-origin' });
  return response.json();
}

const endpoints: RuntimeMonitorEndpoint[] = buildRuntimeMonitorEndpoints(fetchJson);

function loadHistory() {
  history.splice(0, history.length, ...loadHistoryFromStorage<RuntimeHistoryEntry>(STORAGE_KEY, 20));
}

function persistHistory() {
  persistHistoryToStorage(STORAGE_KEY, history, 20);
}

function formatPayload(payload: unknown) {
  return JSON.stringify(payload, null, 2);
}

function setBadge(badgeId: string, status: RuntimeStatus) {
  const badge = document.getElementById(badgeId);
  if (!badge) return;
  badge.className = 'rounded-full px-3 py-1 text-xs font-semibold';
  badge.classList.add(...runtimeMonitorBadgeStyles[status].split(' '));
  badge.textContent = status;
}

function setSummaryTone(id: string, status: RuntimeStatus) {
  setElementClassName(id, buildRuntimeMonitorSummaryTone(status));
}

async function loadEndpoint(endpoint: RuntimeEndpoint) {
  const output = document.getElementById(endpoint.outputId);
  const summary = endpoint.summaryId ? document.getElementById(endpoint.summaryId) : null;
  if (!output) return { key: endpoint.key, status: 'blocked' as RuntimeStatus };

  try {
    const payload = await endpoint.load();
    setTextContent(endpoint.outputId, formatPayload(payload));
    const status = endpoint.pickStatus(payload);
    if (summary && endpoint.summarize) {
      setTextContent(endpoint.summaryId!, endpoint.summarize(payload));
    }
    if (endpoint.key === 'admin-access-coverage') {
      setSummaryTone('admin-access-coverage-summary', status);
      const links = applyRuntimeMonitorCoverageLinks();
      setLinkHref('runtime-admin-access-coverage-download-json', links.json);
      setLinkHref('runtime-admin-access-coverage-download-md', links.markdown);
    }
    setBadge(endpoint.badgeId, status);
    return { key: endpoint.key, status };
  } catch (error) {
    setTextContent(endpoint.outputId, formatPayload({ error: error instanceof Error ? error.message : String(error) }));
    if (summary) {
      setTextContent(endpoint.summaryId!, error instanceof Error ? error.message : String(error));
    }
    if (endpoint.key === 'admin-access-coverage') {
      setSummaryTone('admin-access-coverage-summary', 'blocked');
    }
    setBadge(endpoint.badgeId, 'blocked');
    return { key: endpoint.key, status: 'blocked' as RuntimeStatus };
  }
}

async function refreshRuntimeMonitor() {
  const statusLine = document.getElementById('runtime-monitor-status');
  const trendLine = document.getElementById('runtime-monitor-trend');
  const lastRefresh = document.getElementById('runtime-monitor-last-refresh');
  const deltaLine = document.getElementById('runtime-monitor-delta');
  if (statusLine) setTextContent('runtime-monitor-status', 'Veriler yenileniyor.');

  const results = await Promise.all(endpoints.map(loadEndpoint));
  const blockedCount = results.filter((item) => item.status === 'blocked').length;
  const degradedCount = results.filter((item) => item.status === 'degraded').length;
  const overall: RuntimeStatus = blockedCount > 0 ? 'blocked' : degradedCount > 0 ? 'degraded' : 'healthy';
  const refreshedAt = new Date().toISOString();
  prependHistoryEntry(history, { overall, blockedCount, degradedCount, refreshedAt }, 20);
  persistHistory();
  const previous = history[1];

  if (statusLine) {
    setTextContent(
      'runtime-monitor-status',
      `Genel durum: ${overall}. Healthy: ${results.filter((item) => item.status === 'healthy').length}, degraded: ${degradedCount}, blocked: ${blockedCount}.`
    );
  }
  if (lastRefresh) setTextContent('runtime-monitor-last-refresh', refreshedAt);
  if (trendLine) {
    setTextContent('runtime-monitor-trend', buildRuntimeTrend(history));
  }
  if (deltaLine) {
    setTextContent('runtime-monitor-delta', buildRuntimeDelta(previous, history[0]!, history));
  }
}

export function initRuntimeMonitorPage() {
  loadHistory();
  startAutoRefreshPage({
    refreshButtonId: 'refresh-runtime-monitor',
    initialRender: () => {
      const trendLine = document.getElementById('runtime-monitor-trend');
      if (trendLine && history.length > 0) {
        setTextContent('runtime-monitor-trend', buildRuntimeTrend(history));
      }
      const deltaLine = document.getElementById('runtime-monitor-delta');
      if (deltaLine && history.length > 1) {
        setTextContent('runtime-monitor-delta', buildRuntimeDelta(history[1], history[0], history));
      }
    },
    refresh: () => {
      void refreshRuntimeMonitor();
    },
  });
}
