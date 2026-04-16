export function bindRefreshButton(buttonId: string, refresh: () => void) {
  document.getElementById(buttonId)?.addEventListener('click', () => {
    refresh();
  });
}

export function startAutoRefreshPage(options: {
  refreshButtonId: string;
  initialRender?: () => void;
  refresh: () => void;
  intervalMs?: number;
}) {
  bindRefreshButton(options.refreshButtonId, options.refresh);
  options.initialRender?.();
  options.refresh();
  window.setInterval(() => {
    options.refresh();
  }, options.intervalMs ?? 60000);
}
