import {
  approveAdminVerification,
  fetchAdminVerifications,
  rejectAdminVerification,
} from '../lib/admin-browser-client';
import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  canRejectVerification,
  getAdminVerificationRequests,
  isVerificationMutationSuccessful,
  normalizeRejectReason,
  renderAdminVerificationQueue,
} from '../lib/admin-verification-queue';
import type { AdminVerificationsListData } from '../types/admin-api';

type VerificationQueueRoot = HTMLElement & { dataset: DOMStringMap };

function writePayload(root: VerificationQueueRoot, payload: AdminVerificationsListData | null) {
  if (!payload) {
    delete root.dataset.payload;
    return;
  }

  root.dataset.payload = JSON.stringify(payload);
}

function readPayload(root: VerificationQueueRoot): AdminVerificationsListData | null {
  const raw = root.dataset.payload;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AdminVerificationsListData;
  } catch {
    return null;
  }
}

function setError(root: VerificationQueueRoot, message: string | null) {
  if (message) root.dataset.error = message;
  else delete root.dataset.error;
}

function setProcessingId(root: VerificationQueueRoot, verificationId: string | null) {
  if (verificationId) root.dataset.processingId = verificationId;
  else delete root.dataset.processingId;
}

function readRejectReasons(root: VerificationQueueRoot): Record<string, string> {
  const raw = root.dataset.rejectReasons;
  if (!raw) return {};

  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function writeRejectReasons(root: VerificationQueueRoot, reasons: Record<string, string>) {
  const entries = Object.entries(reasons).filter(([, value]) => value.trim().length > 0);
  if (entries.length === 0) {
    delete root.dataset.rejectReasons;
    return;
  }

  root.dataset.rejectReasons = JSON.stringify(Object.fromEntries(entries));
}

function setShowRejectFormId(root: VerificationQueueRoot, verificationId: string | null) {
  if (verificationId) root.dataset.showRejectFormId = verificationId;
  else delete root.dataset.showRejectFormId;
}

async function fetchQueue(root: VerificationQueueRoot) {
  const payload = await fetchAdminVerifications(50);
  if (!payload.success) {
    throw new Error('Doğrulama talepleri alınırken hata oluştu');
  }

  writePayload(root, payload);
  setError(root, null);
}

async function renderRoot(root: VerificationQueueRoot) {
  const loading = root.querySelector<HTMLElement>('[data-admin-verification-queue-loading]');
  const content = root.querySelector<HTMLElement>('[data-admin-verification-queue-content]');
  if (!loading || !content) return;

  setElementClassName(loading, 'py-8 text-center text-gray-500');
  setElementClassName(content, 'hidden');

  try {
    if (!root.dataset.payload && !root.dataset.error) {
      await fetchQueue(root);
    }

    setElementHtml(
      content,
      renderAdminVerificationQueue({
        verifications: getAdminVerificationRequests(readPayload(root)),
        error: root.dataset.error || null,
        processingId: root.dataset.processingId || null,
        showRejectFormId: root.dataset.showRejectFormId || null,
        rejectReasons: readRejectReasons(root),
      }),
    );
    bindInteractions(root, content);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu');
    setElementHtml(
      content,
      renderAdminVerificationQueue({
        verifications: [],
        error: root.dataset.error || 'Bilinmeyen bir hata oluştu',
        processingId: root.dataset.processingId || null,
        showRejectFormId: root.dataset.showRejectFormId || null,
        rejectReasons: readRejectReasons(root),
      }),
    );
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

async function approveVerification(root: VerificationQueueRoot, verificationId: string) {
  setProcessingId(root, verificationId);
  try {
    const result = await approveAdminVerification(verificationId);
    if (!isVerificationMutationSuccessful(result)) {
      throw new Error(result?.message || 'Onaylama başarısız');
    }

    setShowRejectFormId(root, null);
    await fetchQueue(root);
  } finally {
    setProcessingId(root, null);
  }
}

async function rejectVerification(root: VerificationQueueRoot, verificationId: string) {
  const reasons = readRejectReasons(root);
  const reason = normalizeRejectReason(reasons[verificationId]);
  if (!canRejectVerification(reason)) {
    throw new Error('Lütfen reddetme nedenini en az 10 karakter giriniz.');
  }

  setProcessingId(root, verificationId);
  try {
    const result = await rejectAdminVerification(verificationId, reason);
    if (!isVerificationMutationSuccessful(result)) {
      throw new Error(result?.message || 'Reddetme başarısız');
    }

    delete reasons[verificationId];
    writeRejectReasons(root, reasons);
    setShowRejectFormId(root, null);
    await fetchQueue(root);
  } finally {
    setProcessingId(root, null);
  }
}

function bindInteractions(root: VerificationQueueRoot, content: HTMLElement) {
  for (const button of Array.from(content.querySelectorAll<HTMLElement>('[data-admin-verification-approve]'))) {
    button.addEventListener('click', async () => {
      const verificationId = button.dataset.adminVerificationApprove;
      if (!verificationId) return;

      try {
        await approveVerification(root, verificationId);
      } catch (error) {
        setError(root, error instanceof Error ? error.message : 'İşlem başarısız');
      }
      await renderRoot(root);
    });
  }

  for (const button of Array.from(content.querySelectorAll<HTMLElement>('[data-admin-verification-toggle-reject]'))) {
    button.addEventListener('click', async () => {
      const verificationId = button.dataset.adminVerificationToggleReject;
      if (!verificationId) return;

      setShowRejectFormId(root, verificationId);
      await renderRoot(root);
    });
  }

  for (const button of Array.from(content.querySelectorAll<HTMLElement>('[data-admin-verification-cancel-reject]'))) {
    button.addEventListener('click', async () => {
      setShowRejectFormId(root, null);
      await renderRoot(root);
    });
  }

  for (const field of Array.from(content.querySelectorAll<HTMLTextAreaElement>('[data-admin-verification-reason]'))) {
    field.addEventListener('input', () => {
      const verificationId = field.dataset.adminVerificationReason;
      if (!verificationId) return;

      const reasons = readRejectReasons(root);
      reasons[verificationId] = field.value;
      writeRejectReasons(root, reasons);
    });
  }

  for (const button of Array.from(content.querySelectorAll<HTMLElement>('[data-admin-verification-submit-reject]'))) {
    button.addEventListener('click', async () => {
      const verificationId = button.dataset.adminVerificationSubmitReject;
      if (!verificationId) return;

      try {
        await rejectVerification(root, verificationId);
      } catch (error) {
        setError(root, error instanceof Error ? error.message : 'İşlem başarısız');
      }
      await renderRoot(root);
    });
  }
}

export function initAdminVerificationQueue() {
  const roots = Array.from(document.querySelectorAll<VerificationQueueRoot>('[data-admin-verification-queue]'));

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    void renderRoot(root);
  }
}
