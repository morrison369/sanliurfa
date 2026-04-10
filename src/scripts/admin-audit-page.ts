import {
  buildAdminAuditLogsCsvUrl,
  fetchAdminAuditLogs,
} from '../lib/admin-browser-client';
import type { AdminAuditLogsData } from '../types/admin-api';

type AdminAuditEntry = AdminAuditLogsData['logs'][number];

const allEntries: AdminAuditEntry[] = [];

function getInputValue(id: string): string {
  const element = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
  return element?.value?.trim() ?? '';
}

function getServerFilterQuery() {
  const requestId = getInputValue('audit-request-id');
  const startDate = getInputValue('audit-start-date');
  const endDate = getInputValue('audit-end-date');

  return {
    requestId: requestId || undefined,
    startDate: startDate ? new Date(startDate).toISOString() : undefined,
    endDate: endDate ? new Date(endDate).toISOString() : undefined,
    limit: 100,
  };
}

function renderRows(entries: AdminAuditEntry[]) {
  const tbody = document.getElementById('audit-rows');
  if (!tbody) return;

  if (entries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-6 text-center text-gray-500">Kayıt yok.</td></tr>';
    return;
  }

  tbody.innerHTML = entries
    .map((entry) => `
      <tr>
        <td class="px-4 py-3 text-gray-600 dark:text-gray-300">${entry.timestamp}</td>
        <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">${String((entry as any).endpoint ?? '')}</td>
        <td class="px-4 py-3 text-gray-600 dark:text-gray-300">${String((entry as any).method ?? '')}</td>
        <td class="px-4 py-3 text-gray-600 dark:text-gray-300">${String((entry as any).mode ?? '')}</td>
        <td class="px-4 py-3 text-gray-600 dark:text-gray-300">${String((entry as any).outcome ?? '')}</td>
        <td class="px-4 py-3 text-gray-600 dark:text-gray-300">${String((entry as any).statusCode ?? '')}</td>
        <td class="px-4 py-3 text-gray-600 dark:text-gray-300">${String((entry as any).actorKey ?? '')}</td>
      </tr>
    `)
    .join('');
}

function applyFilters() {
  const endpoint = getInputValue('audit-endpoint').toLowerCase();
  const actor = getInputValue('audit-actor').toLowerCase();
  const requestId = getInputValue('audit-request-id').toLowerCase();
  const mode = getInputValue('audit-mode');
  const outcome = getInputValue('audit-outcome');
  const status = getInputValue('audit-status');

  const filtered = allEntries.filter((entry) => {
    const normalized = entry as any;
    if (endpoint && !String(normalized.endpoint ?? '').toLowerCase().includes(endpoint)) return false;
    if (actor && !String(normalized.actorKey ?? '').toLowerCase().includes(actor)) return false;
    if (requestId && !String(normalized.requestId ?? '').toLowerCase().includes(requestId)) return false;
    if (mode && normalized.mode !== mode) return false;
    if (outcome && normalized.outcome !== outcome) return false;
    if (status && String(normalized.statusCode ?? '') !== status) return false;
    return true;
  });

  renderRows(filtered);
  const summary = document.getElementById('audit-summary');
  if (summary) {
    const deniedCount = filtered.filter((entry) => (entry as any).outcome === 'denied').length;
    const writeCount = filtered.filter((entry) => (entry as any).mode === 'write').length;
    summary.textContent = `Görünen kayıt: ${filtered.length}. Denied: ${deniedCount}. Write: ${writeCount}.`;
  }
}

async function loadAudit() {
  const payload = await fetchAdminAuditLogs(getServerFilterQuery());
  allEntries.splice(0, allEntries.length, ...(payload.logs.slice(0, 100) as AdminAuditEntry[]));
  const summary = document.getElementById('audit-summary');
  if (summary && payload.summary) {
    summary.textContent = `Server filtresi sonrası ${payload.totalFiltered ?? payload.count} kayıt. Son ${payload.summary.windowHours} saatte toplam ${payload.summary.total} kayıt. Denied: ${payload.summary.deniedCount}. Rate limit: ${payload.summary.rateLimitedCount}.`;
  }
  applyFilters();
}

function exportAuditCsv() {
  window.location.href = buildAdminAuditLogsCsvUrl(getServerFilterQuery());
}

export function initAdminAuditPage() {
  ['audit-endpoint', 'audit-actor', 'audit-request-id', 'audit-mode', 'audit-outcome', 'audit-status'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', applyFilters);
    document.getElementById(id)?.addEventListener('change', applyFilters);
  });
  ['audit-start-date', 'audit-end-date'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', () => {
      void loadAudit();
    });
  });
  document.getElementById('refresh-admin-audit')?.addEventListener('click', () => {
    void loadAudit();
  });
  document.getElementById('export-admin-audit-csv')?.addEventListener('click', exportAuditCsv);
  void loadAudit();
}
