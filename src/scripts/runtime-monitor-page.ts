import {
  buildRuntimeDelta,
  buildRuntimeTrend,
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

const STORAGE_KEY = 'runtime-monitor-history-v1';
const history: RuntimeHistoryEntry[] = [];

async function fetchJson(url: string): Promise<any> {
  const response = await fetch(url, { credentials: 'same-origin' });
  return response.json();
}

const endpoints: RuntimeMonitorEndpoint[] = buildRuntimeMonitorEndpoints(fetchJson);

function loadHistory() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      history.splice(0, history.length, ...parsed.slice(0, 20));
    }
  } catch {}
}

function persistHistory() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 20)));
  } catch {}
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

function setLink(id: string, href: string) {
  const link = document.getElementById(id) as HTMLAnchorElement | null;
  if (!link) return;
  link.href = href;
}

function setSummaryTone(id: string, status: RuntimeStatus) {
  const element = document.getElementById(id);
  if (!element) return;
  element.className = buildRuntimeMonitorSummaryTone(status);
}

async function loadEndpoint(endpoint: RuntimeEndpoint) {
  const output = document.getElementById(endpoint.outputId);
  const summary = endpoint.summaryId ? document.getElementById(endpoint.summaryId) : null;
  if (!output) return { key: endpoint.key, status: 'blocked' as RuntimeStatus };

  try {
    const payload = await endpoint.load();
    output.textContent = formatPayload(payload);
    const status = endpoint.pickStatus(payload);
    if (summary && endpoint.summarize) {
      summary.textContent = endpoint.summarize(payload);
    }
    if (endpoint.key === 'admin-access-coverage') {
      setSummaryTone('admin-access-coverage-summary', status);
      const links = applyRuntimeMonitorCoverageLinks();
      setLink('runtime-admin-access-coverage-download-json', links.json);
      setLink('runtime-admin-access-coverage-download-md', links.markdown);
    }
    setBadge(endpoint.badgeId, status);
    return { key: endpoint.key, status };
  } catch (error) {
    output.textContent = formatPayload({ error: error instanceof Error ? error.message : String(error) });
    if (summary) {
      summary.textContent = error instanceof Error ? error.message : String(error);
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
  if (statusLine) statusLine.textContent = 'Veriler yenileniyor.';

  const results = await Promise.all(endpoints.map(loadEndpoint));
  const blockedCount = results.filter((item) => item.status === 'blocked').length;
  const degradedCount = results.filter((item) => item.status === 'degraded').length;
  const overall: RuntimeStatus = blockedCount > 0 ? 'blocked' : degradedCount > 0 ? 'degraded' : 'healthy';
  const refreshedAt = new Date().toISOString();
  history.unshift({ overall, blockedCount, degradedCount, refreshedAt });
  history.splice(20);
  persistHistory();
  const previous = history[1];

  if (statusLine) {
    statusLine.textContent = `Genel durum: ${overall}. Healthy: ${results.filter((item) => item.status === 'healthy').length}, degraded: ${degradedCount}, blocked: ${blockedCount}.`;
  }
  if (lastRefresh) lastRefresh.textContent = refreshedAt;
  if (trendLine) {
    trendLine.textContent = buildRuntimeTrend(history);
  }
  if (deltaLine) {
    deltaLine.textContent = buildRuntimeDelta(previous, history[0]!, history);
  }
}

export function initRuntimeMonitorPage() {
  document.getElementById('refresh-runtime-monitor')?.addEventListener('click', () => {
    void refreshRuntimeMonitor();
  });
  loadHistory();
  const trendLine = document.getElementById('runtime-monitor-trend');
  if (trendLine && history.length > 0) {
    trendLine.textContent = buildRuntimeTrend(history);
  }
  const deltaLine = document.getElementById('runtime-monitor-delta');
  if (deltaLine && history.length > 1) {
    deltaLine.textContent = buildRuntimeDelta(history[1], history[0], history);
  }
  void refreshRuntimeMonitor();
  window.setInterval(() => {
    void refreshRuntimeMonitor();
  }, 60000);
}
