export function shouldShowPwaPrompt(showPrompt: boolean, isInstalled: boolean): boolean {
  return showPrompt && !isInstalled;
}

export function buildPwaPromptClassName(visible: boolean): string {
  return visible
    ? 'fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-gray-200 bg-white p-4 shadow-lg'
    : 'fixed bottom-4 right-4 z-50 hidden max-w-sm rounded-lg border border-gray-200 bg-white p-4 shadow-lg';
}

export function extractVapidKey(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';

  const directValue = (payload as { vapidKey?: unknown }).vapidKey;
  if (typeof directValue === 'string') {
    return directValue;
  }

  const dataValue = (payload as { data?: { vapidKey?: unknown } }).data?.vapidKey;
  if (typeof dataValue === 'string') {
    return dataValue;
  }

  return '';
}
