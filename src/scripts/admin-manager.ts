import { setElementHtml } from '../lib/admin-dom';
import { normalizeAdminManagerTab, renderAdminManager } from '../lib/admin-manager';

type AdminManagerRoot = HTMLElement & { dataset: DOMStringMap };

function readTab(root: AdminManagerRoot) {
  return normalizeAdminManagerTab(root.dataset.activeTab);
}

function bindInteractions(root: AdminManagerRoot, content: HTMLElement) {
  const buttons = Array.from(content.querySelectorAll<HTMLElement>('[data-admin-manager-tab]'));

  for (const button of buttons) {
    button.addEventListener('click', () => {
      root.dataset.activeTab = normalizeAdminManagerTab(button.dataset.adminManagerTab);
      renderRoot(root);
    });
  }
}

function renderRoot(root: AdminManagerRoot) {
  const content = root.querySelector<HTMLElement>('[data-admin-manager-content]');
  if (!content) return;

  setElementHtml(content, renderAdminManager(readTab(root)));
  bindInteractions(root, content);
}

export function initAdminManager() {
  const roots = Array.from(document.querySelectorAll<AdminManagerRoot>('[data-admin-manager]'));

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    if (!root.dataset.activeTab) {
      root.dataset.activeTab = 'places';
    }
    renderRoot(root);
  }
}
