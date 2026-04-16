import { fetchAdminDashboardOverview } from '../lib/admin-browser-client';
import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import { renderAdminDashboardOverview } from '../lib/admin-dashboard-overview';

type AdminDashboardOverviewRoot = HTMLElement & { dataset: DOMStringMap };

function readPeriod(root: AdminDashboardOverviewRoot): number {
  return Number(root.dataset.period || '30');
}

function writePeriod(root: AdminDashboardOverviewRoot, period: number) {
  root.dataset.period = String(period);
}

function setError(root: AdminDashboardOverviewRoot, message: string | null) {
  if (message) root.dataset.error = message;
  else delete root.dataset.error;
}

function readData(root: AdminDashboardOverviewRoot) {
  try {
    return root.dataset.payload ? JSON.parse(root.dataset.payload) : null;
  } catch {
    return null;
  }
}

function writeData(root: AdminDashboardOverviewRoot, payload: unknown) {
  root.dataset.payload = JSON.stringify(payload);
}

async function loadOverview(root: AdminDashboardOverviewRoot) {
  const period = readPeriod(root);
  const payload = await fetchAdminDashboardOverview(period);

  if (!payload.success) {
    throw new Error('Veri alınırken bir hata oluştu');
  }

  writeData(root, payload.data);
  setError(root, null);
}

function bindInteractions(root: AdminDashboardOverviewRoot, content: HTMLElement) {
  const periodButtons = Array.from(
    content.querySelectorAll<HTMLElement>('[data-admin-dashboard-period]'),
  );

  for (const button of periodButtons) {
    button.addEventListener('click', async () => {
      const nextPeriod = Number(button.dataset.adminDashboardPeriod || '30');
      if (nextPeriod === readPeriod(root)) return;
      writePeriod(root, nextPeriod);
      delete root.dataset.payload;
      await renderRoot(root);
    });
  }
}

async function renderRoot(root: AdminDashboardOverviewRoot) {
  const loading = root.querySelector<HTMLElement>('[data-admin-dashboard-overview-loading]');
  const content = root.querySelector<HTMLElement>('[data-admin-dashboard-overview-content]');
  if (!loading || !content) return;

  try {
    if (!root.dataset.payload) {
      await loadOverview(root);
    }

    setElementHtml(
      content,
      renderAdminDashboardOverview({
        data: readData(root),
        error: root.dataset.error || null,
        period: readPeriod(root),
      }),
    );
    bindInteractions(root, content);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu');
    setElementHtml(
      content,
      renderAdminDashboardOverview({
        data: null,
        error: root.dataset.error || 'Bilinmeyen bir hata oluştu',
        period: readPeriod(root),
      }),
    );
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

export function initAdminDashboardOverview() {
  const roots = Array.from(
    document.querySelectorAll<AdminDashboardOverviewRoot>('[data-admin-dashboard-overview]'),
  );

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    writePeriod(root, readPeriod(root));
    void renderRoot(root);
  }
}
