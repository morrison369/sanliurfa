import { renderVendorDashboard, type VendorDashboardTab } from '../lib/vendor-dashboard';
import { readDatasetOrStoredTab, writeStoredString } from './shared/persisted-ui-state';
import { getRootContent, renderRootContent } from './shared/root-render';

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
  const content = getRootContent(root, '[data-vendor-dashboard-content]');
  if (!content) return;

  renderRootContent({
    root,
    contentSelector: '[data-vendor-dashboard-content]',
    html: renderVendorDashboard({
      activeTab: readTab(root),
    }),
    bind: (nextContent) => {
      bindActions(root, nextContent);
    },
  });
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
