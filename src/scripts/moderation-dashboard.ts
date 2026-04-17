import {
  createAdminModerationAction,
  fetchAdminModerationReports,
  fetchAdminModerationStats,
  updateAdminModerationReport,
} from '../lib/admin-browser-client';
import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  createModerationDashboardState,
  extractModerationReports,
  extractModerationStats,
  normalizeModerationDashboardTab,
  normalizeModerationReportFilter,
  renderModerationDashboard,
  type ModerationDashboardState,
} from '../lib/moderation-dashboard';

type ModerationRoot = HTMLElement & { dataset: DOMStringMap };

function readState(root: ModerationRoot): ModerationDashboardState {
  const raw = root.dataset.state;
  if (!raw) return createModerationDashboardState();
  try {
    return JSON.parse(raw) as ModerationDashboardState;
  } catch {
    return createModerationDashboardState();
  }
}

function writeState(root: ModerationRoot, state: ModerationDashboardState) {
  root.dataset.state = JSON.stringify(state);
}

function renderRoot(root: ModerationRoot) {
  const loading = root.querySelector<HTMLElement>('[data-moderation-dashboard-loading]');
  const content = root.querySelector<HTMLElement>('[data-moderation-dashboard-content]');
  if (!loading || !content) return;

  const state = readState(root);
  if (state.loading && !state.stats) {
    setElementClassName(loading, 'text-center py-8');
    setElementClassName(content, 'hidden');
    return;
  }

  setElementHtml(content, renderModerationDashboard(state));
  setElementClassName(loading, 'hidden');
  setElementClassName(content, '');
  bindInteractions(root, content);
}

async function loadData(root: ModerationRoot) {
  const state = readState(root);
  writeState(root, { ...state, loading: true, error: null });
  renderRoot(root);

  const [statsData, reportsData] = await Promise.all([
    fetchAdminModerationStats(),
    fetchAdminModerationReports({
      status: state.reportFilter === 'all' ? undefined : state.reportFilter,
    }),
  ]);

  writeState(root, {
    ...readState(root),
    stats: extractModerationStats(statsData),
    reports: extractModerationReports(reportsData),
    loading: false,
    error: null,
  });
  renderRoot(root);
}

function bindInteractions(root: ModerationRoot, content: HTMLElement) {
  for (const button of Array.from(content.querySelectorAll<HTMLElement>('[data-moderation-tab]'))) {
    button.addEventListener('click', () => {
      const state = readState(root);
      writeState(root, {
        ...state,
        selectedTab: normalizeModerationDashboardTab(button.dataset.moderationTab),
      });
      renderRoot(root);
    });
  }

  for (const button of Array.from(content.querySelectorAll<HTMLElement>('[data-moderation-filter]'))) {
    button.addEventListener('click', () => {
      const filter = normalizeModerationReportFilter(button.dataset.moderationFilter);
      const state = readState(root);
      writeState(root, {
        ...state,
        reportFilter: filter,
      });
      void loadData(root).catch((error: unknown) => {
        const current = readState(root);
        writeState(root, {
          ...current,
          loading: false,
          error: error instanceof Error ? error.message : 'Bir hata olustu',
        });
        renderRoot(root);
      });
    });
  }

  for (const button of Array.from(content.querySelectorAll<HTMLElement>('[data-moderation-open-action]'))) {
    button.addEventListener('click', () => {
      const state = readState(root);
      writeState(root, {
        ...state,
        actionModalOpen: true,
        actionForm: {
          ...state.actionForm,
          report_id: button.dataset.moderationOpenAction || '',
          target_user_id: button.dataset.moderationTargetUser || '',
        },
      });
      renderRoot(root);
    });
  }

  for (const button of Array.from(content.querySelectorAll<HTMLElement>('[data-moderation-report-status]'))) {
    button.addEventListener('click', () => {
      const [reportId, status] = (button.dataset.moderationReportStatus || '').split(':');
      if (!reportId || !status) return;
      void updateAdminModerationReport(reportId, {
        status,
        resolution_note: 'Yonetici tarafindan islendi',
      }).then(() => loadData(root)).catch((error: unknown) => {
        const current = readState(root);
        writeState(root, {
          ...current,
          error: error instanceof Error ? error.message : 'Bir hata olustu',
        });
        renderRoot(root);
      });
    });
  }

  const closeAction = content.querySelector<HTMLElement>('[data-moderation-close-action]');
  closeAction?.addEventListener('click', () => {
    const state = readState(root);
    writeState(root, {
      ...state,
      actionModalOpen: false,
    });
    renderRoot(root);
  });

  const actionType = content.querySelector<HTMLSelectElement>('[data-moderation-action-type]');
  actionType?.addEventListener('change', () => {
    const state = readState(root);
    writeState(root, {
      ...state,
      actionForm: {
        ...state.actionForm,
        action_type: actionType.value as ModerationDashboardState['actionForm']['action_type'],
      },
    });
    renderRoot(root);
  });

  const actionReason = content.querySelector<HTMLTextAreaElement>('[data-moderation-action-reason]');
  actionReason?.addEventListener('input', () => {
    const state = readState(root);
    writeState(root, {
      ...state,
      actionForm: {
        ...state.actionForm,
        reason: actionReason.value,
      },
    });
  });

  const actionDuration = content.querySelector<HTMLInputElement>('[data-moderation-action-duration]');
  actionDuration?.addEventListener('input', () => {
    const state = readState(root);
    writeState(root, {
      ...state,
      actionForm: {
        ...state.actionForm,
        duration_days: Number.parseInt(actionDuration.value || '7', 10),
      },
    });
  });

  const form = content.querySelector<HTMLFormElement>('[data-moderation-action-form]');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const state = readState(root);
    if (!state.actionForm.report_id || !state.actionForm.target_user_id) {
      writeState(root, {
        ...state,
        error: 'Rapor ID ve kullanici ID gereklidir',
      });
      renderRoot(root);
      return;
    }

    void createAdminModerationAction(state.actionForm).then(() => {
      writeState(root, {
        ...readState(root),
        actionModalOpen: false,
        actionForm: {
          report_id: '',
          target_user_id: '',
          action_type: 'warning',
          reason: '',
          duration_days: 7,
        },
      });
      return loadData(root);
    }).catch((error: unknown) => {
      const current = readState(root);
      writeState(root, {
        ...current,
        error: error instanceof Error ? error.message : 'Bir hata olustu',
      });
      renderRoot(root);
    });
  });
}

export function initModerationDashboard() {
  const roots = Array.from(document.querySelectorAll<ModerationRoot>('[data-moderation-dashboard]'));
  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    writeState(root, createModerationDashboardState());
    renderRoot(root);
    void loadData(root).catch((error: unknown) => {
      const state = readState(root);
      writeState(root, {
        ...state,
        loading: false,
        error: error instanceof Error ? error.message : 'Bir hata olustu',
      });
      renderRoot(root);
    });
  }
}
