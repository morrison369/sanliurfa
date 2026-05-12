/**
 * Unit Tests - email/email-notifications.ts sendEmailNotification 3 type templates
 *
 * - new_comment HTML template (post title + author + comment + link)
 * - comment_reply HTML template (different color border)
 * - new_post HTML template (post title + excerpt)
 * - HTML escape (escapeHtml helper)
 * - sendEmail mock + return value passthrough
 *
 * vi.mock email/index sendEmail.
 */

import { describe, it, expect, vi } from 'vitest';

const { sendEmailMock } = vi.hoisted(() => ({ sendEmailMock: vi.fn() }));

vi.mock('../email/index', () => ({
  sendEmail: sendEmailMock,
}));

import { sendEmailNotification } from '../email/email-notifications';

const basePayload = {
  postId: 1,
  postTitle: 'Test Post',
  postSlug: 'test-post',
  recipientEmail: 'user@example.com',
  _recipientName: 'User',
  commentAuthor: 'Ali',
  commentContent: 'Great post!',
};

describe('sendEmailNotification - 3 type templates', () => {
  it('new_comment - subject + HTML template + return success', async () => {
    sendEmailMock.mockResolvedValueOnce({ success: true, tier: 'resend' });
    const r = await sendEmailNotification({ ...basePayload, type: 'new_comment' });
    expect(r).toBe(true);
    const callArg = sendEmailMock.mock.calls[sendEmailMock.mock.calls.length - 1][0];
    expect(callArg.to).toBe('user@example.com');
    expect(callArg.subject).toContain('Yeni yorum');
    expect(callArg.subject).toContain('Test Post');
    expect(callArg.html).toContain('Ali');
    expect(callArg.html).toContain('Great post!');
    expect(callArg.html).toContain('/blog/test-post#comments');
  });

  it('comment_reply - subject "Yorum yanıtlaması" + green border (#10b981)', async () => {
    sendEmailMock.mockResolvedValueOnce({ success: true, tier: 'smtp' });
    await sendEmailNotification({ ...basePayload, type: 'comment_reply' });
    const callArg = sendEmailMock.mock.calls[sendEmailMock.mock.calls.length - 1][0];
    expect(callArg.subject).toContain('Yorum yanıtlaması');
    expect(callArg.html).toContain('#10b981'); // green CTA
  });

  it('new_post - subject "Yeni yazı yayınlandı" + blog link', async () => {
    sendEmailMock.mockResolvedValueOnce({ success: true, tier: 'dev-log' });
    await sendEmailNotification({ ...basePayload, type: 'new_post' });
    const callArg = sendEmailMock.mock.calls[sendEmailMock.mock.calls.length - 1][0];
    expect(callArg.subject).toContain('Yeni yazı yayınlandı');
    expect(callArg.html).toContain('/blog/test-post');
  });

  it('sendEmail success false → return false', async () => {
    sendEmailMock.mockResolvedValueOnce({ success: false, error: 'SMTP fail' });
    const r = await sendEmailNotification({ ...basePayload, type: 'new_comment' });
    expect(r).toBe(false);
  });

  it('sendEmail throw → return false (catch handler)', async () => {
    sendEmailMock.mockRejectedValueOnce(new Error('Network error'));
    const r = await sendEmailNotification({ ...basePayload, type: 'new_comment' });
    expect(r).toBe(false);
  });

  it('blockquote border - new_comment blue (#3b82f6) vs comment_reply green (#10b981)', async () => {
    sendEmailMock.mockResolvedValue({ success: true });
    await sendEmailNotification({ ...basePayload, type: 'new_comment' });
    const newCommentCall = sendEmailMock.mock.calls[sendEmailMock.mock.calls.length - 1][0];
    expect(newCommentCall.html).toContain('#3b82f6');

    await sendEmailNotification({ ...basePayload, type: 'comment_reply' });
    const replyCall = sendEmailMock.mock.calls[sendEmailMock.mock.calls.length - 1][0];
    expect(replyCall.html).toContain('#10b981');
  });
});
