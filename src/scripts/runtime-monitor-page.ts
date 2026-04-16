import {
  buildAdminAccessCoverageReportUrl,
  fetchAdminAccessCoverageReport,
  fetchAdminPerformanceOptimization,
} from '../lib/admin-browser-client';

type RuntimeStatus = 'healthy' | 'degraded' | 'blocked';

interface RuntimeHistoryEntry {
  overall: RuntimeStatus;
  blockedCount: number;
  degradedCount: number;
  refreshedAt: string;
}

interface RuntimeEndpoint {
  key: string;
  url: string;
  outputId: string;
  badgeId: string;
  summaryId?: string;
  load: () => Promise<unknown>;
  pickStatus: (payload: any) => RuntimeStatus;
  summarize?: (payload: any) => string;
}

const badgeStyles: Record<RuntimeStatus, string> = {
  healthy: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  degraded: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  blocked: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const STORAGE_KEY = 'runtime-monitor-history-v1';
const history: RuntimeHistoryEntry[] = [];

async function fetchJson(url: string): Promise<any> {
  const response = await fetch(url, { credentials: 'same-origin' });
  return response.json();
}

const endpoints: RuntimeEndpoint[] = [
  {
    key: 'health',
    url: '/api/health',
    outputId: 'health-output',
    badgeId: 'health-badge',
    load: () => fetchJson('/api/health'),
    pickStatus: (payload) => payload?.data?.status ?? 'blocked',
  },
  {
    key: 'health-detailed',
    url: '/api/health/detailed',
    outputId: 'health-detailed-output',
    badgeId: 'health-detailed-badge',
    load: () => fetchJson('/api/health/detailed'),
    pickStatus: (payload) => payload?.data?.status ?? 'blocked',
  },
  {
    key: 'performance',
    url: '/api/performance',
    outputId: 'performance-output',
    badgeId: 'performance-badge',
    load: () => fetchJson('/api/performance'),
    pickStatus: (payload) => payload?.data?.serviceLevelObjectives?.webhookIngestion?.status ?? 'blocked',
  },
  {
    key: 'optimization',
    url: '/api/admin/performance/optimization',
    outputId: 'optimization-output',
    badgeId: 'optimization-badge',
    load: () => fetchAdminPerformanceOptimization(),
    pickStatus: (payload) => payload?.artifactHealthSummary?.overall ?? 'blocked',
  },
  {
    key: 'admin-access-coverage',
    url: '/api/admin/system/admin-access-coverage',
    outputId: 'admin-access-coverage-output',
    badgeId: 'admin-access-coverage-badge',
    summaryId: 'admin-access-coverage-summary',
    load: () => fetchAdminAccessCoverageReport(),
    pickStatus: (payload) => payload?.data?.artifact?.status ?? 'blocked',
    summarize: (payload) => {
      const report = payload?.data?.report;
      const firstDrift = report?.driftedFiles?.[0] ?? 'yok';
      return `Coverage %${report?.coveragePercent ?? 'yok'} • Drift ${report?.driftCount ?? 'yok'} • İlk dosya: ${firstDrift}`;
    },
  },
];

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

function getSameStatusSinceMinutes(overall: RuntimeStatus) {
  let oldestMatching = history[0];
  for (const entry of history) {
    if (entry.overall !== overall) break;
    oldestMatching = entry;
  }
  return Math.round(
    (new Date(history[0].refreshedAt).getTime() - new Date(oldestMatching.refreshedAt).getTime()) / 60000
  );
}

function formatPayload(payload: unknown) {
  return JSON.stringify(payload, null, 2);
}

function setBadge(badgeId: string, status: RuntimeStatus) {
  const badge = document.getElementById(badgeId);
  if (!badge) return;
  badge.className = 'rounded-full px-3 py-1 text-xs font-semibold';
  badge.classList.add(...badgeStyles[status].split(' '));
  badge.textContent = status;
}

function setLink(id: string, href: string) {
  const link = document.getElementById(id) as HTMLAnchorElement | null;
  if (!link) return;
  link.href = href;
}

async function loadEndpoint(endpoint: RuntimeEndpoint) {
  const output = document.getElementById(endpoint.outputId);
  const summary = endpoint.summaryId ? document.getElementById(endpoint.summaryId) : null;
  if (!output) return { key: endpoint.key, status: 'blocked' as RuntimeStatus };

  try {
    const payload = await endpoint.load();
    output.textContent = formatPayload(payload);
    if (summary && endpoint.summarize) {
      summary.textContent = endpoint.summarize(payload);
    }
    if (endpoint.key === 'admin-access-coverage') {
      setLink('runtime-admin-access-coverage-download-json', buildAdminAccessCoverageReportUrl('json'));
      setLink('runtime-admin-access-coverage-download-md', buildAdminAccessCoverageReportUrl('markdown'));
    }
    const status = endpoint.pickStatus(payload);
    setBadge(endpoint.badgeId, status);
    return { key: endpoint.key, status };
  } catch (error) {
    output.textContent = formatPayload({ error: error instanceof Error ? error.message : String(error) });
    if (summary) {
      summary.textContent = error instanceof Error ? error.message : String(error);
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
    trendLine.textContent = history
      .slice(0, 5)
      .map((entry) => `${entry.refreshedAt.slice(11, 19)} ${entry.overall} (d:${entry.degradedCount} b:${entry.blockedCount})`)
      .join(' | ');
  }
  if (deltaLine) {
    if (!previous) {
      deltaLine.textContent = 'İlk snapshot alındı.';
    } else {
      deltaLine.textContent = `${previous.overall} -> ${overall} • yaklaşık ${getSameStatusSinceMinutes(overall)} dk`;
    }
  }
}

export function initRuntimeMonitorPage() {
  document.getElementById('refresh-runtime-monitor')?.addEventListener('click', () => {
    void refreshRuntimeMonitor();
  });
  loadHistory();
  const trendLine = document.getElementById('runtime-monitor-trend');
  if (trendLine && history.length > 0) {
    trendLine.textContent = history
      .slice(0, 5)
      .map((entry) => `${entry.refreshedAt.slice(11, 19)} ${entry.overall} (d:${entry.degradedCount} b:${entry.blockedCount})`)
      .join(' | ');
  }
  const deltaLine = document.getElementById('runtime-monitor-delta');
  if (deltaLine && history.length > 1) {
    deltaLine.textContent = `${history[1].overall} -> ${history[0].overall}`;
  }
  void refreshRuntimeMonitor();
  window.setInterval(() => {
    void refreshRuntimeMonitor();
  }, 60000);
}
