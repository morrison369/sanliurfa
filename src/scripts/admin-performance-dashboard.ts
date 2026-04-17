import { fetchAdminPerformanceOptimization } from '../lib/admin-browser-client';
import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  extractAdminPerformanceDashboardData,
  normalizeAdminPerformanceTab,
  renderAdminPerformanceDashboard,
  type AdminPerformanceDashboardTab,
} from '../lib/admin-performance-dashboard';
import type { AdminPerformanceOptimizationData } from '../types/admin-api';

type AdminPerformanceRoot = HTMLElement & { dataset: DOMStringMap };

function readTab(root: AdminPerformanceRoot): AdminPerformanceDashboardTab {
  return normalizeAdminPerformanceTab(root.dataset.tab);
}

function readData(root: AdminPerformanceRoot): AdminPerformanceOptimizationData | null {
  const raw = root.dataset.payload;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AdminPerformanceOptimizationData;
  } catch {
    return null;
  }
}

function writeData(root: AdminPerformanceRoot, data: AdminPerformanceOptimizationData | null) {
  if (!data) {
    delete root.dataset.payload;
    return;
  }

  root.dataset.payload = JSON.stringify(data);
}

function setError(root: AdminPerformanceRoot, message: string | null) {
  if (message) root.dataset.error = message;
  else delete root.dataset.error;
}

async function fetchPerformance(root: AdminPerformanceRoot) {
  const payload = await fetchAdminPerformanceOptimization();
  const data = extractAdminPerformanceDashboardData(payload);
  if (!data) {
    throw new Error('Performans verisi yuklenirken bir hata olustu');
  }

  writeData(root, data);
  setError(root, null);
}

function bindInteractions(root: AdminPerformanceRoot, content: HTMLElement) {
  const buttons = Array.from(content.querySelectorAll<HTMLElement>('[data-admin-performance-tab]'));

  for (const button of buttons) {
    button.addEventListener('click', async () => {
      const nextTab = normalizeAdminPerformanceTab(button.dataset.adminPerformanceTab);
      if (nextTab === readTab(root)) return;
      root.dataset.tab = nextTab;
      await renderRoot(root);
    });
  }
}

async function renderRoot(root: AdminPerformanceRoot) {
  const loading = root.querySelector<HTMLElement>('[data-admin-performance-loading]');
  const content = root.querySelector<HTMLElement>('[data-admin-performance-content]');
  if (!loading || !content) return;

  setElementClassName(loading, 'flex items-center justify-center p-8');
  setElementClassName(content, 'hidden');

  try {
    if (!root.dataset.payload && !root.dataset.error) {
      await fetchPerformance(root);
    }

    setElementHtml(
      content,
      renderAdminPerformanceDashboard({
        tab: readTab(root),
        data: readData(root),
        error: root.dataset.error || null,
      }),
    );
    bindInteractions(root, content);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'Performans verisi yuklenirken bir hata olustu');
    setElementHtml(
      content,
      renderAdminPerformanceDashboard({
        tab: readTab(root),
        data: null,
        error: root.dataset.error || 'Performans verisi yuklenirken bir hata olustu',
      }),
    );
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

export function initAdminPerformanceDashboard() {
  const roots = Array.from(document.querySelectorAll<AdminPerformanceRoot>('[data-admin-performance-dashboard]'));

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    root.dataset.tab = readTab(root);
    void renderRoot(root);
  }
}
