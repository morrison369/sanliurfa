import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  createDefaultNotificationPreferences,
  extractNotificationPreferencesError,
  extractNotificationPreferencesSuccessMessage,
  extractNotificationPreferenceValue,
  renderNotificationPreferencesContent,
  renderNotificationPreferencesError,
  type NotificationPreferencesState,
} from '../lib/notification-preferences';

type PreferencesRoot = HTMLElement & { dataset: DOMStringMap };
type PreferencesMessage = { type: 'success' | 'error'; text: string } | null;

function readPreferences(root: PreferencesRoot): NotificationPreferencesState {
  const raw = root.dataset.preferencesJson;
  if (!raw) return createDefaultNotificationPreferences();

  try {
    return JSON.parse(raw) as NotificationPreferencesState;
  } catch {
    return createDefaultNotificationPreferences();
  }
}

function writePreferences(root: PreferencesRoot, preferences: NotificationPreferencesState) {
  root.dataset.preferencesJson = JSON.stringify(preferences);
}

function readMessage(root: PreferencesRoot): PreferencesMessage {
  if (!root.dataset.messageType || !root.dataset.messageText) return null;
  return {
    type: root.dataset.messageType as 'success' | 'error',
    text: root.dataset.messageText,
  };
}

function writeMessage(root: PreferencesRoot, message: PreferencesMessage) {
  if (!message) {
    delete root.dataset.messageType;
    delete root.dataset.messageText;
    return;
  }

  root.dataset.messageType = message.type;
  root.dataset.messageText = message.text;
}

async function loadPreferences() {
  const preferences = createDefaultNotificationPreferences();
  await Promise.all(
    Object.keys(preferences).map(async (type) => {
      const response = await fetch(`/api/notifications/preferences?type=${type}`);
      if (!response.ok) {
        throw new Error('Bildirim tercihleri yüklenemedi');
      }

      preferences[type] = extractNotificationPreferenceValue(await response.json());
    }),
  );

  return preferences;
}

function bindPreferenceInteractions(root: PreferencesRoot, content: HTMLElement) {
  content.querySelectorAll<HTMLInputElement>('[data-pref-toggle]').forEach((input) => {
    input.addEventListener('change', () => {
      const token = input.dataset.prefToggle;
      if (!token) return;
      const [type, field] = token.split(':');
      const preferences = readPreferences(root);
      preferences[type] = {
        ...preferences[type],
        [field]: input.checked,
      };
      writePreferences(root, preferences);
      void renderPreferencesRoot(root, false);
    });
  });

  content.querySelectorAll<HTMLSelectElement>('[data-pref-frequency]').forEach((select) => {
    select.addEventListener('change', () => {
      const type = select.dataset.prefFrequency;
      if (!type) return;
      const preferences = readPreferences(root);
      preferences[type] = {
        ...preferences[type],
        frequency: select.value,
      };
      writePreferences(root, preferences);
      void renderPreferencesRoot(root, false);
    });
  });

  content.querySelectorAll<HTMLElement>('[data-pref-save]').forEach((button) => {
    button.addEventListener('click', () => {
      const type = button.dataset.prefSave;
      if (!type || root.dataset.savingType) return;
      void savePreferences(root, type);
    });
  });
}

async function savePreferences(root: PreferencesRoot, notificationType: string) {
  root.dataset.savingType = notificationType;
  writeMessage(root, null);
  await renderPreferencesRoot(root, false);

  try {
    const preferences = readPreferences(root);
    const response = await fetch('/api/notifications/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notificationType,
        preferences: preferences[notificationType],
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(extractNotificationPreferencesError(payload, 'Kaydedilirken hata oluştu'));
    }

    writeMessage(root, {
      type: 'success',
      text: extractNotificationPreferencesSuccessMessage(payload),
    });
  } catch (error) {
    writeMessage(root, {
      type: 'error',
      text: error instanceof Error ? error.message : 'Kaydedilirken hata oluştu',
    });
  } finally {
    delete root.dataset.savingType;
    await renderPreferencesRoot(root, false);
  }
}

async function renderPreferencesRoot(root: PreferencesRoot, bootstrap: boolean) {
  const loading = root.querySelector<HTMLElement>('[data-preferences-loading]');
  const content = root.querySelector<HTMLElement>('[data-preferences-content]');
  if (!loading || !content) return;

  try {
    if (bootstrap || !root.dataset.preferencesJson) {
      writePreferences(root, await loadPreferences());
    }

    setElementHtml(
      content,
      renderNotificationPreferencesContent({
        preferences: readPreferences(root),
        savingType: root.dataset.savingType || null,
        message: readMessage(root),
      }),
    );
    bindPreferenceInteractions(root, content);
  } catch (error) {
    setElementHtml(
      content,
      renderNotificationPreferencesError(
        error instanceof Error ? error.message : 'Bildirim tercihleri yüklenemedi',
      ),
    );
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

export function initNotificationPreferences() {
  const roots = Array.from(document.querySelectorAll<PreferencesRoot>('[data-notification-preferences]'));

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    void renderPreferencesRoot(root, true);
  }
}
