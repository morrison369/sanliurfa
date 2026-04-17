import { extractEnvelopeMessage, resolveNestedEnvelopeData } from './api-envelope';
import { renderErrorState } from './render-states';

export interface NotificationTypeDefinition {
  key: string;
  label: string;
  description: string;
}

export interface NotificationPreferenceValue {
  inAppEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  frequency: string;
}

export type NotificationPreferencesState = Record<string, NotificationPreferenceValue>;

export const NOTIFICATION_TYPES: NotificationTypeDefinition[] = [
  { key: 'message', label: 'Yeni mesajlar', description: 'Kullanıcılardan mesaj aldığınızda' },
  { key: 'review', label: 'Yorum bildirimleri', description: 'Değerlendirmenize yorum yazıldığında' },
  { key: 'like', label: 'Beğeni bildirimleri', description: 'İçeriğiniz beğenildiğinde' },
  { key: 'follow', label: 'Takip bildirimleri', description: 'Bir kullanıcı sizi takip ettiğinde' },
  { key: 'mention', label: 'Bahsedilme bildirimleri', description: 'Sizden bahsedildiğinde' },
  { key: 'marketing', label: 'Pazarlama e-postaları', description: 'Özel teklifler, kampanyalar ve haberler' },
];

export function createDefaultNotificationPreferences(): NotificationPreferencesState {
  return Object.fromEntries(
    NOTIFICATION_TYPES.map((type) => [
      type.key,
      {
        inAppEnabled: true,
        pushEnabled: true,
        emailEnabled: false,
        frequency: 'immediate',
      },
    ]),
  );
}

export function extractNotificationPreferenceValue(payload: unknown): NotificationPreferenceValue {
  const data = resolveNestedEnvelopeData(payload);
  const preferences =
    data.preferences && typeof data.preferences === 'object'
      ? (data.preferences as Partial<NotificationPreferenceValue>)
      : {};

  return {
    inAppEnabled: preferences.inAppEnabled ?? true,
    pushEnabled: preferences.pushEnabled ?? true,
    emailEnabled: preferences.emailEnabled ?? true,
    frequency: preferences.frequency ?? 'immediate',
  };
}

export function extractNotificationPreferencesSuccessMessage(payload: unknown): string {
  return extractEnvelopeMessage(payload, 'Tercihler kaydedildi.');
}

export function extractNotificationPreferencesError(payload: unknown, fallback: string): string {
  return extractEnvelopeMessage(payload, fallback);
}

export function renderNotificationPreferencesError(message: string): string {
  return renderErrorState(message);
}

function renderNotificationMessage(type: 'success' | 'error', text: string): string {
  const wrapperClass =
    type === 'success'
      ? 'rounded-lg border border-green-200 bg-green-50 p-4'
      : 'rounded-lg border border-red-200 bg-red-50 p-4';
  const textClass = type === 'success' ? 'text-green-700' : 'text-red-700';

  return `
    <div class="${wrapperClass}">
      <p class="text-sm ${textClass}">${text}</p>
    </div>
  `;
}

function renderPreferenceCard(
  type: NotificationTypeDefinition,
  preferences: NotificationPreferenceValue,
  savingType: string | null,
): string {
  const isSaving = savingType === type.key;
  return `
    <div class="rounded-lg border border-gray-200 bg-white p-6">
      <h3 class="mb-1 font-semibold text-gray-900">${type.label}</h3>
      <p class="mb-4 text-sm text-gray-600">${type.description}</p>
      <div class="mb-4 space-y-3">
        <label class="flex items-center gap-3">
          <input type="checkbox" data-pref-toggle="${type.key}:inAppEnabled" ${preferences.inAppEnabled ? 'checked' : ''} class="h-4 w-4 rounded border-gray-300" />
          <span class="text-sm text-gray-700">Uygulama içinde bildir</span>
        </label>
        <label class="flex items-center gap-3">
          <input type="checkbox" data-pref-toggle="${type.key}:pushEnabled" ${preferences.pushEnabled ? 'checked' : ''} class="h-4 w-4 rounded border-gray-300" />
          <span class="text-sm text-gray-700">Push bildirimi gönder</span>
        </label>
        <label class="flex items-center gap-3">
          <input type="checkbox" data-pref-toggle="${type.key}:emailEnabled" ${preferences.emailEnabled ? 'checked' : ''} class="h-4 w-4 rounded border-gray-300" />
          <span class="text-sm text-gray-700">E-posta gönder</span>
        </label>
      </div>
      <div class="mb-4">
        <label class="mb-2 block text-sm font-medium text-gray-700">Sıklık</label>
        <select data-pref-frequency="${type.key}" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="immediate" ${preferences.frequency === 'immediate' ? 'selected' : ''}>Anlık</option>
          <option value="daily" ${preferences.frequency === 'daily' ? 'selected' : ''}>Günlük özet</option>
          <option value="weekly" ${preferences.frequency === 'weekly' ? 'selected' : ''}>Haftalık özet</option>
          <option value="never" ${preferences.frequency === 'never' ? 'selected' : ''}>Hiçbir zaman</option>
        </select>
      </div>
      <button type="button" data-pref-save="${type.key}" ${isSaving ? 'disabled' : ''} class="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
        ${isSaving ? 'Tercihler kaydediliyor...' : 'Tercihleri kaydet'}
      </button>
    </div>
  `;
}

export function renderNotificationPreferencesContent(options: {
  preferences: NotificationPreferencesState;
  savingType: string | null;
  message?: { type: 'success' | 'error'; text: string } | null;
}): string {
  return `
    <div class="space-y-6">
      <div class="mb-6 flex items-center gap-3">
        <h1 class="text-2xl font-bold text-gray-900">Bildirim tercihleri</h1>
      </div>
      ${options.message ? renderNotificationMessage(options.message.type, options.message.text) : ''}
      <div class="space-y-4">
        ${NOTIFICATION_TYPES.map((type) => renderPreferenceCard(type, options.preferences[type.key], options.savingType)).join('')}
      </div>
    </div>
  `;
}
