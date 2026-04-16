import { buildAdminAuditLogsCsvUrl, fetchAdminAuditLogs } from '../lib/admin-browser-client';
import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import { renderAuditLogViewer, type AuditLogEntry } from '../lib/audit-log-viewer';

type AuditLogViewerRoot = HTMLElement & { dataset: DOMStringMap };

function readEntries(root: AuditLogViewerRoot): AuditLogEntry[] {
  const raw = root.dataset.logs;
  if (!raw) return [];

  try {
    return JSON.parse(raw) as AuditLogEntry[];
  } catch {
    return [];
  }
}

function writeEntries(root: AuditLogViewerRoot, entries: AuditLogEntry[]) {
  root.dataset.logs = JSON.stringify(entries);
}

function setError(root: AuditLogViewerRoot, message: string | null) {
  if (message) root.dataset.error = message;
  else delete root.dataset.error;
}

function readFilterValue(content: HTMLElement, name: string): string {
  const element = content.querySelector<HTMLInputElement | HTMLSelectElement>(
    `[data-audit-log-filter="${name}"]`,
  );
  return element?.value?.trim() ?? '';
}

function applyLocalFilters(root: AuditLogViewerRoot, content: HTMLElement): AuditLogEntry[] {
  const endpoint = readFilterValue(content, 'endpoint').toLowerCase();
  const actor = readFilterValue(content, 'actor').toLowerCase();
  const mode = readFilterValue(content, 'mode');
  const outcome = readFilterValue(content, 'outcome');

  return readEntries(root).filter((entry) => {
    const normalized = entry as Record<string, unknown>;
    if (endpoint && !String(normalized.endpoint ?? '').toLowerCase().includes(endpoint)) return false;
    if (actor && !String(normalized.actorKey ?? '').toLowerCase().includes(actor)) return false;
    if (mode && normalized.mode !== mode) return false;
    if (outcome && normalized.outcome !== outcome) return false;
    return true;
  });
}

function buildSummary(entries: AuditLogEntry[], total: number): string {
  const denied = entries.filter((entry) => String((entry as Record<string, unknown>).outcome ?? '') === 'denied').length;
  const writes = entries.filter((entry) => String((entry as Record<string, unknown>).mode ?? '') === 'write').length;
  return `Görünen kayıt: ${entries.length}. Toplam yüklenen: ${total}. Denied: ${denied}. Write: ${writes}.`;
}

async function fetchLogs(root: AuditLogViewerRoot) {
  const payload = await fetchAdminAuditLogs({ limit: 100 });
  writeEntries(root, payload.logs as AuditLogEntry[]);
  root.dataset.total = String(payload.count ?? payload.logs.length);
  setError(root, null);
}

function bindInteractions(root: AuditLogViewerRoot, content: HTMLElement) {
  const filterElements = Array.from(
    content.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-audit-log-filter]'),
  );
  for (const element of filterElements) {
    const handler = async () => {
      await renderRoot(root);
    };
    element.addEventListener('input', handler);
    element.addEventListener('change', handler);
  }

  const refreshButton = content.querySelector<HTMLElement>('[data-audit-log-refresh]');
  refreshButton?.addEventListener('click', async () => {
    try {
      delete root.dataset.logs;
      await renderRoot(root);
    } catch {
      // no-op
    }
  });

  const exportButton = content.querySelector<HTMLElement>('[data-audit-log-export]');
  exportButton?.addEventListener('click', () => {
    window.location.href = buildAdminAuditLogsCsvUrl({ limit: 100 });
  });
}

async function renderRoot(root: AuditLogViewerRoot) {
  const loading = root.querySelector<HTMLElement>('[data-audit-log-loading]');
  const content = root.querySelector<HTMLElement>('[data-audit-log-content]');
  if (!loading || !content) return;

  try {
    if (!root.dataset.logs && !root.dataset.error) {
      await fetchLogs(root);
    }

    const filtered = applyLocalFilters(root, content);
    setElementHtml(
      content,
      renderAuditLogViewer({
        logs: filtered,
        error: root.dataset.error || null,
        summary: buildSummary(filtered, Number(root.dataset.total || filtered.length)),
      }),
    );
    bindInteractions(root, content);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'Audit logları alınamadı');
    setElementHtml(
      content,
      renderAuditLogViewer({
        logs: [],
        error: root.dataset.error || 'Audit logları alınamadı',
        summary: buildSummary([], 0),
      }),
    );
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

export function initAuditLogViewer() {
  const roots = Array.from(document.querySelectorAll<AuditLogViewerRoot>('[data-audit-log-viewer]'));

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    void renderRoot(root);
  }
}
