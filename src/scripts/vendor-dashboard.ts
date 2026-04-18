import { setElementHtml } from '../lib/admin-dom';
import { renderVendorDashboard, type VendorDashboardTab } from '../lib/vendor-dashboard';

type VendorDashboardRoot = HTMLElement & { dataset: DOMStringMap };
const VENDOR_DASHBOARD_TAB_STORAGE_KEY = 'sanliurfa:vendor-dashboard:active-tab';

function readTab(root: VendorDashboardRoot): VendorDashboardTab {
  const tab = root.dataset.activeTab;
  return tab === 'listings' || tab === 'reviews' || tab === 'ads' ? tab : 'overview';
}

function readStoredTab(): VendorDashboardTab {
  try {
    const tab = window.localStorage.getItem(VENDOR_DASHBOARD_TAB_STORAGE_KEY);
    return tab === 'listings' || tab === 'reviews' || tab === 'ads' ? tab : 'overview';
  } catch {
    return 'overview';
  }
}

function writeStoredTab(tab: VendorDashboardTab) {
  try {
    window.localStorage.setItem(VENDOR_DASHBOARD_TAB_STORAGE_KEY, tab);
  } catch {
    // no-op
  }
}

function renderRoot(root: VendorDashboardRoot) {
  const content = root.querySelector<HTMLElement>('[data-vendor-dashboard-content]');
  if (!content) return;

  setElementHtml(
    content,
    renderVendorDashboard({
      activeTab: readTab(root),
    }),
  );
  bindActions(root, content);
}

function bindActions(root: VendorDashboardRoot, content: HTMLElement) {
  content.querySelectorAll<HTMLElement>('[data-vendor-dashboard-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      const nextTab = button.dataset.vendorDashboardTab;
      root.dataset.activeTab =
        nextTab === 'listings' || nextTab === 'reviews' || nextTab === 'ads' ? nextTab : 'overview';
      writeStoredTab(readTab(root));
      renderRoot(root);
    });
  });

  content.querySelectorAll<HTMLElement>('[data-vendor-dashboard-shortcut]').forEach((button) => {
    button.addEventListener('click', (event: Event) => {
      event.preventDefault();
      const nextTab = button.dataset.vendorDashboardShortcut;
      root.dataset.activeTab =
        nextTab === 'listings' || nextTab === 'reviews' || nextTab === 'ads' ? nextTab : 'overview';
      writeStoredTab(readTab(root));
      renderRoot(root);
    });
  });
}

export function initVendorDashboard() {
  const roots = Array.from(document.querySelectorAll<VendorDashboardRoot>('[data-vendor-dashboard]'));
  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    root.dataset.activeTab = readStoredTab();
    renderRoot(root);
  }
}
