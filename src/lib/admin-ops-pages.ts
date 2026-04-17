export type RuntimeStatus = 'healthy' | 'degraded' | 'blocked';

export type RuntimeMonitorHistoryEntry = {
  overall: RuntimeStatus;
  blockedCount: number;
  degradedCount: number;
  refreshedAt: string;
};

export type CoverageHistoryEntry = {
  status: RuntimeStatus;
  driftCount: number;
  coveragePercent: number;
  refreshedAt: string;
};

export function loadHistoryFromStorage<T>(storageKey: string, limit: number): T[] {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed.slice(0, limit) as T[]) : [];
  } catch {
    return [];
  }
}

export function persistHistoryToStorage<T>(storageKey: string, history: T[], limit: number) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(history.slice(0, limit)));
  } catch {}
}

export function prependHistoryEntry<T>(history: T[], entry: T, limit: number) {
  history.unshift(entry);
  history.splice(limit);
}

export function getSameStatusSinceMinutes<T extends { refreshedAt: string }>(
  history: Array<T & ({ overall: RuntimeStatus } | { status: RuntimeStatus })>,
  currentStatus: RuntimeStatus
): number {
  if (history.length === 0) {
    return 0;
  }

  let oldestMatching = history[0];
  for (const entry of history) {
    const status = 'overall' in entry ? entry.overall : entry.status;
    if (status !== currentStatus) break;
    oldestMatching = entry;
  }

  return Math.round(
    (new Date(history[0].refreshedAt).getTime() - new Date(oldestMatching.refreshedAt).getTime()) / 60000
  );
}

export function buildRuntimeTrend(history: RuntimeMonitorHistoryEntry[]): string {
  if (history.length === 0) {
    return 'Henüz veri bulunmuyor.';
  }

  return history
    .slice(0, 5)
    .map((entry) => `${entry.refreshedAt.slice(11, 19)} ${entry.overall} (d:${entry.degradedCount} b:${entry.blockedCount})`)
    .join(' | ');
}

export function buildCoverageTrend(history: CoverageHistoryEntry[]): string {
  if (history.length === 0) {
    return 'Henüz veri bulunmuyor.';
  }

  return history
    .slice(0, 5)
    .map((entry) => `${entry.refreshedAt.slice(11, 19)} ${entry.status} (%${entry.coveragePercent}, drift:${entry.driftCount})`)
    .join(' | ');
}

export function buildRuntimeDelta(
  previous: RuntimeMonitorHistoryEntry | undefined,
  current: RuntimeMonitorHistoryEntry,
  history: RuntimeMonitorHistoryEntry[]
): string {
  if (!previous) {
    return 'İlk snapshot alındı.';
  }

  return `${previous.overall} -> ${current.overall} • yaklaşık ${getSameStatusSinceMinutes(history, current.overall)} dk`;
}

export function buildCoverageDelta(
  previous: CoverageHistoryEntry | undefined,
  current: CoverageHistoryEntry,
  history: CoverageHistoryEntry[]
): string {
  if (!previous) {
    return 'İlk snapshot alındı.';
  }

  return `${previous.status} -> ${current.status} • yaklaşık ${getSameStatusSinceMinutes(history, current.status)} dk`;
}

export function buildCoverageAlert(options: {
  status: RuntimeStatus;
  driftCount: number;
  firstDriftFile?: string;
}): { tone: RuntimeStatus; text: string } {
  if (options.driftCount > 0) {
    return {
      tone: 'blocked',
      text: `Uyarı: ${options.driftCount} wrapper drift bulundu. İlk dosya: ${options.firstDriftFile || 'bilinmiyor'}.`,
    };
  }

  if (options.status !== 'healthy') {
    return {
      tone: 'degraded',
      text: 'Uyarı: Coverage raporu mevcut ama freshness durumu healthy değil.',
    };
  }

  return {
    tone: 'healthy',
    text: 'Durum normal: Wrapper coverage drift görünmüyor ve artifact healthy.',
  };
}
