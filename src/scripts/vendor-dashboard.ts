import { setElementHtml } from '../lib/admin-dom';
import { renderVendorDashboard, type VendorDashboardTab } from '../lib/vendor-dashboard';
import { readDatasetOrStoredTab, writeStoredString } from './shared/persisted-ui-state';

type VendorDashboardRoot = HTMLElement & { dataset: DOMStringMap };
const VENDOR_DASHBOARD_TAB_STORAGE_KEY = 'sanliurfa:vendor-dashboard:active-tab';
const VENDOR_DASHBOARD_TABS = ['overview', 'listings', 'reviews', 'ads'] as const;

function readTab(root: VendorDashboardRoot): VendorDashboardTab {
  return readDatasetOrStoredTab(
    root,
    'activeTab',
    VENDOR_DASHBOARD_TAB_STORAGE_KEY,
    VENDOR_DASHBOARD_TABS,
    'overview',
  );
}

function writeStoredTab(tab: VendorDashboardTab) {
  writeStoredString(VENDOR_DASHBOARD_TAB_STORAGE_KEY, tab);
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
    root.dataset.activeTab = readTab(root);
    renderRoot(root);
  }
}
