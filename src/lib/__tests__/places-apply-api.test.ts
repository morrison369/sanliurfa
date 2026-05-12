/**
 * API Contract Tests - POST /api/places/apply
 *
 * - Content-Type dispatch: JSON / form-urlencoded / multipart accepted
 * - Unsupported Content-Type → 400 (caught by readBody throw)
 * - Validation: name required (min 2 max 200) → 422
 * - description maxLength 1000 → 422
 * - Anonymous submission allowed (authenticatedUserId null)
 * - Authenticated submission - userId passed through
 * - submitPlaceApplication helper called with normalized payload
 * - snake_case + camelCase aliases (owner_email / ownerEmail / submitter_email)
 * - Helper throws → 400 with safeErrorDetail (HARD RULE #9)
 *
 * vi.hoisted - submitPlaceApplication mock.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

const { submitPlaceApplicationMock } = vi.hoisted(() => ({
  submitPlaceApplicationMock: vi.fn(),
}));

vi.mock('../places/place-application', () => ({
  submitPlaceApplication: submitPlaceApplicationMock,
}));

beforeEach(() => {
  submitPlaceApplicationMock.mockReset();
  submitPlaceApplicationMock.mockResolvedValue({ id: 'app-1', status: 'pending' });
});

import { POST } from '../../pages/api/places/apply';

const validBody = {
  name: 'Test Cafe',
  address: 'Şanlıurfa',
  phone: '0444444444',
  owner_name: 'Ali',
  owner_email: 'ali@t.com',
};

describe('POST /api/places/apply', () => {
  it('valid JSON - submitPlaceApplication called + 201', async () => {
    const ctx = createApiContext({ method: 'POST', body: validBody, locals: {} });
    const resp = await POST(ctx);
    expect(resp.status).toBe(201);
    expect(submitPlaceApplicationMock).toHaveBeenCalled();
    const call = submitPlaceApplicationMock.mock.calls[0][0];
    expect(call.name).toBe('Test Cafe');
    expect(call.ownerName).toBe('Ali');
    expect(call.ownerEmail).toBe('ali@t.com');
    expect(call.authenticatedUserId).toBeNull();
  });

  it('name too short (<2 chars) → 422 validation error', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { ...validBody, name: 'X' },
      locals: {},
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
    const data = await parseJson(resp);
    expect(data.type).toBe('/problems/validation-error');
    expect(submitPlaceApplicationMock).not.toHaveBeenCalled();
  });

  it('name too long (>200 chars) → 422', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { ...validBody, name: 'a'.repeat(201) },
      locals: {},
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('description > 1000 → 422', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { ...validBody, description: 'a'.repeat(1001) },
      locals: {},
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('authenticated user - authenticatedUserId passed + email fallback from session', async () => {
    const authUser = { id: 'user-1', email: 'session@t.com', role: 'user', fullName: 'Session User' };
    const bodyNoEmail = { name: 'Test Cafe', address: 'Şanlıurfa' };
    const ctx = createApiContext({
      method: 'POST',
      body: bodyNoEmail,
      locals: { user: authUser },
    });
    await POST(ctx);
    const call = submitPlaceApplicationMock.mock.calls[0][0];
    expect(call.authenticatedUserId).toBe('user-1');
    expect(call.ownerEmail).toBe('session@t.com');
    expect(call.ownerName).toBe('Session User');
  });

  it('camelCase aliases supported (ownerEmail / ownerName)', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { name: 'Cafe', address: 'X', ownerName: 'CamelCase Name', ownerEmail: 'cc@t.com' },
      locals: {},
    });
    await POST(ctx);
    const call = submitPlaceApplicationMock.mock.calls[0][0];
    expect(call.ownerName).toBe('CamelCase Name');
    expect(call.ownerEmail).toBe('cc@t.com');
  });

  it('submitter_email/submitter_name aliases supported (legacy)', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { name: 'Cafe', address: 'X', submitter_name: 'Legacy', submitter_email: 'legacy@t.com' },
      locals: {},
    });
    await POST(ctx);
    const call = submitPlaceApplicationMock.mock.calls[0][0];
    expect(call.ownerName).toBe('Legacy');
    expect(call.ownerEmail).toBe('legacy@t.com');
  });

  it('short_description fallback to description when missing', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { ...validBody, description: 'Long description here' },
      locals: {},
    });
    await POST(ctx);
    const call = submitPlaceApplicationMock.mock.calls[0][0];
    expect(call.shortDescription).toBe('Long description here');
  });

  it('helper throws → 400 problem+json (HARD RULE #9 safeErrorDetail)', async () => {
    submitPlaceApplicationMock.mockRejectedValueOnce(new Error('DB constraint duplicate_key_places_name'));
    const ctx = createApiContext({ method: 'POST', body: validBody, locals: {} });
    const resp = await POST(ctx);
    expect(resp.status).toBe(400);
    const data = await parseJson(resp);
    expect(data.type).toBe('/problems/places-apply-failed');
  });

  it('Unsupported Content-Type → 400 (readBody throws)', async () => {
    const req = new Request('http://localhost/api/places/apply', {
      method: 'POST',
      body: 'plain text body',
      headers: { 'Content-Type': 'text/plain' },
    });
    const ctx: any = { request: req, locals: {} };
    const resp = await POST(ctx);
    expect(resp.status).toBe(400);
  });

  it('form-urlencoded body parsed via formData', async () => {
    const fd = new URLSearchParams();
    fd.set('name', 'Form Cafe');
    fd.set('address', 'Şanlıurfa');
    const req = new Request('http://localhost/api/places/apply', {
      method: 'POST',
      body: fd,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const ctx: any = { request: req, locals: {} };
    const resp = await POST(ctx);
    expect(resp.status).toBe(201);
    expect(submitPlaceApplicationMock.mock.calls[0][0].name).toBe('Form Cafe');
  });
});
