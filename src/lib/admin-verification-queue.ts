import type {
  AdminVerificationApproveData,
  AdminVerificationRejectData,
  AdminVerificationsListData,
} from '../types/admin-api';

type VerificationRequest = AdminVerificationsListData['verifications'][number];

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function getAdminVerificationRequests(
  payload: AdminVerificationsListData | null | undefined,
): VerificationRequest[] {
  return payload?.success ? payload.verifications || [] : [];
}

export function isVerificationMutationSuccessful(
  payload: AdminVerificationApproveData | AdminVerificationRejectData | null | undefined,
): boolean {
  return Boolean(payload?.success);
}

export function normalizeRejectReason(value: string | null | undefined): string {
  return (value || '').trim();
}

export function canRejectVerification(value: string | null | undefined): boolean {
  return normalizeRejectReason(value).length >= 10;
}

function renderRejectForm(verificationId: string, reason: string, processingId: string | null): string {
  const busy = processingId === verificationId;

  return `
    <div class="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <label class="mb-2 block text-sm font-medium text-gray-700">
        Reddetme nedeni (minimum 10 karakter)
      </label>
      <textarea
        data-admin-verification-reason="${verificationId}"
        rows="3"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
        placeholder="Reddetme nedenini açıklayın..."
      >${escapeHtml(reason)}</textarea>
      <div class="mt-3 flex gap-2">
        <button
          type="button"
          data-admin-verification-submit-reject="${verificationId}"
          ${busy ? 'disabled' : ''}
          class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          ${busy ? 'İşleniyor...' : 'Reddet'}
        </button>
        <button
          type="button"
          data-admin-verification-cancel-reject="${verificationId}"
          ${busy ? 'disabled' : ''}
          class="rounded-lg bg-gray-300 px-4 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-400 disabled:opacity-50"
        >
          İptal et
        </button>
      </div>
    </div>
  `;
}

function renderVerificationCard(options: {
  verification: VerificationRequest;
  processingId: string | null;
  showRejectFormId: string | null;
  rejectReasons: Record<string, string>;
}): string {
  const { verification, processingId, showRejectFormId, rejectReasons } = options;
  const busy = processingId === verification.id;
  const rating =
    typeof verification.rating === 'number' ? `${verification.rating.toFixed(1)}⭐` : 'Yok';

  return `
    <article class="rounded-lg border border-gray-200 bg-white p-6">
      <div class="mb-4 flex items-start justify-between">
        <div>
          <h3 class="font-semibold text-gray-900">${escapeHtml(verification.placeName)}</h3>
          <p class="mt-1 text-sm text-gray-600">
            Kategori: ${escapeHtml(verification.category || 'Belirtilmedi')} • Puan: ${rating}
          </p>
          <p class="mt-2 text-xs text-gray-500">
            Talep tarihi: ${new Date(verification.requestedAt).toLocaleDateString('tr-TR')}
          </p>
          <p class="mt-2 text-sm text-gray-700">${escapeHtml(verification.reason || 'Açıklama bulunmuyor')}</p>
        </div>
      </div>

      ${
        showRejectFormId === verification.id
          ? renderRejectForm(verification.id, rejectReasons[verification.id] || '', processingId)
          : ''
      }

      <div class="flex gap-2">
        <button
          type="button"
          data-admin-verification-approve="${verification.id}"
          ${busy ? 'disabled' : ''}
          class="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
        >
          ${busy ? 'İşleniyor...' : 'Onayla'}
        </button>
        ${
          showRejectFormId === verification.id
            ? ''
            : `<button
                type="button"
                data-admin-verification-toggle-reject="${verification.id}"
                ${busy ? 'disabled' : ''}
                class="rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-200 disabled:opacity-50"
              >
                Reddet
              </button>`
        }
      </div>
    </article>
  `;
}

export function renderAdminVerificationQueue(options: {
  verifications: VerificationRequest[];
  error: string | null;
  processingId: string | null;
  showRejectFormId: string | null;
  rejectReasons: Record<string, string>;
}): string {
  if (options.error) {
    return `
      <div class="rounded-lg border border-red-200 bg-red-50 p-4">
        <p class="text-red-700">${escapeHtml(options.error)}</p>
      </div>
    `;
  }

  if (options.verifications.length === 0) {
    return `
      <div class="py-12 text-center">
        <p class="text-gray-500">Bekleme listesinde doğrulama talebi bulunmuyor.</p>
      </div>
    `;
  }

  return `
    <div class="space-y-4">
      ${options.verifications
        .map((verification) =>
          renderVerificationCard({
            verification,
            processingId: options.processingId,
            showRejectFormId: options.showRejectFormId,
            rejectReasons: options.rejectReasons,
          }),
        )
        .join('')}
    </div>
  `;
}
