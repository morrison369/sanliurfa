import type { APIRoute } from 'astro';
import {
  approveAndPublishSiteSetting,
  auditSiteChange,
  getSiteSettingDraft,
  getSiteSetting,
  listPendingSiteSettingApprovals,
  listSiteSettingHistory,
  publishSiteSetting,
  requestSiteSettingApproval,
  saveSiteSettingDraft,
} from '../../../../lib/site-content';
import { validateSiteSetting } from '../../../../lib/site-settings-schema';
import { validateSiteSettingWithZod } from '../../../../lib/site-settings-zod';
import { problemJson } from '../../../../lib/api';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isAdmin(locals: any) {
  if (process.env.E2E_ADMIN_BYPASS === '1') return true;
  return Boolean(locals?.isAdmin || locals?.user?.role === 'admin');
}

export const GET: APIRoute = async ({ url, locals }) => {
  if (!isAdmin(locals)) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-unauthorized',
      instance: '/api/admin/site/settings',
    });
  }

  const key = url.searchParams.get('key');
  if (!key) {
    return problemJson({
      status: 400,
      title: 'Geçersiz İstek',
      detail: 'key parametresi zorunludur',
      type: '/problems/admin-site-settings-key-required',
      instance: '/api/admin/site/settings',
    });
  }
  const includeHistory = url.searchParams.get('history') === '1';
  const includePendingApprovals = url.searchParams.get('approvals') === '1';
  const source = url.searchParams.get('source') === 'draft' ? 'draft' : 'published';

  try {
    const setting = source === 'draft' ? await getSiteSettingDraft(key, {}) : await getSiteSetting(key, {});
    if (!includeHistory && !includePendingApprovals) return json({ success: true, key, value: setting });
    const history = await listSiteSettingHistory(key);
    const pendingApprovals = includePendingApprovals ? await listPendingSiteSettingApprovals(key) : [];
    return json({ success: true, key, value: setting, history, pendingApprovals });
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Ayar Okunamadı',
      detail: error instanceof Error ? error.message : 'unknown',
      type: '/problems/admin-site-settings-read-failed',
      instance: '/api/admin/site/settings',
    });
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
  if (!isAdmin(locals)) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-unauthorized',
      instance: '/api/admin/site/settings',
    });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return problemJson({
      status: 400,
      title: 'Invalid JSON',
      detail: 'İstek gövdesi geçerli JSON olmalı',
      type: '/problems/invalid-json',
      instance: '/api/admin/site/settings',
    });
  }

  const key = String(body?.key || '').trim();
  const value = body?.value;
  const description = body?.description ? String(body.description) : null;
  const modeRaw = String(body?.mode || 'publish');
  const mode =
    modeRaw === 'draft' || modeRaw === 'request_approval' || modeRaw === 'approve_publish'
      ? modeRaw
      : 'publish';
  const note = body?.note ? String(body.note) : null;
  const approvalId = body?.approvalId ? String(body.approvalId) : '';

  if (!key) {
    return problemJson({
      status: 400,
      title: 'Geçersiz İstek',
      detail: 'key alanı zorunludur',
      type: '/problems/admin-site-settings-key-required',
      instance: '/api/admin/site/settings',
    });
  }
  const validation = validateSiteSetting(key, value);
  if (!validation.ok) {
    return problemJson({
      status: 400,
      title: 'Validation Failed',
      detail: 'error' in validation ? validation.error : 'validation_failed',
      type: '/problems/admin-site-settings-validation',
      instance: '/api/admin/site/settings',
    });
  }
  const zodValidation = validateSiteSettingWithZod(key, value);
  if (!zodValidation.ok) {
    return problemJson({
      status: 400,
      title: 'Validation Failed',
      detail: 'error' in zodValidation ? zodValidation.error : 'zod_validation_failed',
      type: '/problems/admin-site-settings-zod-validation',
      instance: '/api/admin/site/settings',
    });
  }

  try {
    const updatedBy = locals?.user?.id ? String(locals.user.id) : null;
    const auditCtx = {
      userId: updatedBy,
      actorEmail: locals?.user?.email ? String(locals.user.email) : null,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      userAgent: request.headers.get('user-agent') || null,
    };

    if (mode === 'draft') {
      await saveSiteSettingDraft(key, value, note, updatedBy);
      await auditSiteChange(key, 'draft_save', auditCtx, { note });
      return json({ success: true, key, mode: 'draft' });
    }

    if (mode === 'request_approval') {
      await requestSiteSettingApproval(key, value, note, updatedBy);
      await auditSiteChange(key, 'draft_save', auditCtx, { note, requestedApproval: true });
      return json({ success: true, key, mode: 'request_approval' });
    }

    if (mode === 'approve_publish') {
      if (!approvalId) {
        return problemJson({
          status: 400,
          title: 'Geçersiz İstek',
          detail: 'approvalId zorunludur',
          type: '/problems/admin-site-settings-approval-id-required',
          instance: '/api/admin/site/settings',
        });
      }
      const approved = await approveAndPublishSiteSetting(approvalId, updatedBy, auditCtx);
      return json({ success: true, key: approved.key, mode: 'approve_publish', approvalId });
    }

    await publishSiteSetting(key, value, description, note, auditCtx);
    return json({ success: true, key, mode: 'publish' });
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Ayar Kaydedilemedi',
      detail: error instanceof Error ? error.message : 'unknown',
      type: '/problems/admin-site-settings-save-failed',
      instance: '/api/admin/site/settings',
    });
  }
};
