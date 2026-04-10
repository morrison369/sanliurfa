import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryOneMock = vi.fn();
const queryRowsMock = vi.fn();
const insertMock = vi.fn();
const updateMock = vi.fn();
const queryMock = vi.fn();
const getCacheMock = vi.fn();
const setCacheMock = vi.fn();
const shouldNotifyMock = vi.fn();
const sendEmailMock = vi.fn();

vi.mock('../postgres', () => ({
  queryOne: queryOneMock,
  queryRows: queryRowsMock,
  insert: insertMock,
  update: updateMock,
  query: queryMock
}));

vi.mock('../cache', () => ({
  getCache: getCacheMock,
  setCache: setCacheMock
}));

vi.mock('../logging', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('../email-preferences', () => ({
  shouldNotify: shouldNotifyMock
}));

vi.mock('../email', () => ({
  sendEmail: sendEmailMock
}));

describe('Email contracts hardening', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.RESEND_API_KEY;
  });

  it('should ignore malformed cached email template JSON and fall back to database', async () => {
    getCacheMock.mockResolvedValue('{bad-json');
    queryOneMock.mockResolvedValue({
      name: 'subscription_created',
      subject: 'Hos geldiniz {{name}}',
      html_body: '<p>{{name}}</p>',
      text_body: 'Merhaba {{name}}',
      is_active: true
    });

    const { getEmailTemplate } = await import('../subscription-email-notifications.core');
    const template = await getEmailTemplate('subscription_created');

    expect(queryOneMock).toHaveBeenCalledTimes(1);
    expect(setCacheMock).toHaveBeenCalledTimes(1);
    expect(template?.name).toBe('subscription_created');
  });

  it('should return false when subscription email queue insert fails', async () => {
    insertMock.mockRejectedValue(new Error('queue down'));

    const { queueSubscriptionEmail } = await import('../subscription-email-notifications.core');
    const result = await queueSubscriptionEmail('user-1', 'user@example.com', 'subscription_created', { name: 'Oguz' });

    expect(result).toBe(false);
  });

  it('should persist failed template delivery attempts', async () => {
    queryOneMock.mockResolvedValue({
      name: 'subscription_created',
      subject: 'Hos geldiniz {{name}}',
      html_body: '<p>{{name}}</p>',
      text_body: 'Merhaba {{name}}',
      is_active: true
    });
    insertMock.mockResolvedValue({ id: 'log-1' });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'provider rejected' })
    });
    vi.stubGlobal('fetch', fetchMock as any);
    process.env.RESEND_API_KEY = 'test-key';

    const { sendEmailWithTemplate } = await import('../subscription-email-notifications.core');
    const sent = await sendEmailWithTemplate('user-1', 'user@example.com', 'subscription_created', { name: 'Oguz' });

    expect(sent).toBe(false);
    expect(insertMock).toHaveBeenCalledWith('email_sent_logs', expect.objectContaining({
      status: 'failed',
      to_email: 'user@example.com',
      template_name: 'subscription_created'
    }));

    vi.unstubAllGlobals();
  });

  it('should tolerate malformed campaign segment filters instead of throwing', async () => {
    queryOneMock.mockResolvedValue({
      id: 'campaign-1',
      name: 'Launch',
      subject: 'Subject',
      from_name: 'Ops',
      from_email: 'ops@example.com',
      html_content: '<p>Hello</p>',
      text_content: 'Hello',
      segment: 'custom',
      segment_filters: '{bad-json',
      scheduled_at: null,
      status: 'draft',
      send_count: 0,
      open_count: 0,
      click_count: 0,
      unsubscribe_count: 0,
      bounce_count: 0,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z'
    });

    const { getCampaign } = await import('../email-campaigns');
    const campaign = await getCampaign('campaign-1');

    expect(campaign?.segmentFilters).toBeUndefined();
    expect(campaign?.id).toBe('campaign-1');
  });

  it('should retry schema detection after a transient metadata failure', async () => {
    queryRowsMock
      .mockRejectedValueOnce(new Error('metadata unavailable'))
      .mockResolvedValueOnce([{ column_name: 'html_content' }, { column_name: 'delivery_attempts' }]);
    insertMock.mockResolvedValue({ id: 'queue-1' });

    const { queueEmail } = await import('../email.delivery');

    await queueEmail('legacy@example.com', 'welcome', { fullName: 'Legacy User' }, 'user-1');
    await queueEmail('delivery@example.com', 'welcome', { fullName: 'Delivery User' }, 'user-2');

    expect(insertMock).toHaveBeenNthCalledWith(1, 'email_queue', expect.objectContaining({
      recipient_email: 'legacy@example.com',
      template_type: 'welcome',
      retry_count: 0
    }));
    expect(insertMock).toHaveBeenNthCalledWith(2, 'email_queue', expect.objectContaining({
      recipient_email: 'delivery@example.com',
      html_content: expect.any(String),
      delivery_attempts: 0
    }));
  });

  it('should mark queued emails as failed when recipient is missing', async () => {
    queryRowsMock.mockResolvedValue([{ column_name: 'html_content' }, { column_name: 'delivery_attempts' }]);
    queryOneMock.mockResolvedValue({ delivery_attempts: 0, max_attempts: 1 });

    const { sendEmailViaService } = await import('../email.delivery');
    const result = await sendEmailViaService({ id: 'queue-1' });

    expect(result).toBe(false);
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('UPDATE email_queue'), [
      'failed',
      1,
      'Queued email is missing recipient_email',
      'queue-1'
    ]);
  });

  it('should filter malformed segment user rows instead of returning invalid recipients', async () => {
    queryRowsMock.mockResolvedValue([
      { id: 'user-1', email: 'user1@example.com' },
      { id: null, email: 'missing-id@example.com' },
      { id: 'user-3', email: null }
    ]);

    const { querySegmentUsers } = await import('../email-campaigns');
    const users = await querySegmentUsers('all_users');

    expect(users).toEqual([{ id: 'user-1', email: 'user1@example.com' }]);
  });

  it('should keep campaign metrics at zero instead of producing NaN when no sends exist', async () => {
    queryOneMock.mockResolvedValue({
      id: 'campaign-1',
      name: 'Launch',
      subject: 'Subject',
      from_name: 'Ops',
      from_email: 'ops@example.com',
      html_content: '<p>Hello</p>',
      text_content: 'Hello',
      segment: 'all_users',
      segment_filters: null,
      scheduled_at: null,
      status: 'draft',
      send_count: 0,
      open_count: 4,
      click_count: 2,
      unsubscribe_count: 1,
      bounce_count: 1,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z'
    });

    const { getCampaignMetrics } = await import('../email-campaigns');
    const metrics = await getCampaignMetrics('campaign-1');

    expect(metrics).toEqual(expect.objectContaining({
      sendCount: 0,
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
      unsubscribeRate: 0,
      bounceRate: 0,
      conversionRate: 0
    }));
  });

  it('should send campaign to only one user in test mode', async () => {
    queryOneMock.mockResolvedValue({
      id: 'campaign-1',
      name: 'Launch',
      subject: 'Subject',
      from_name: 'Ops',
      from_email: 'ops@example.com',
      html_content: '<p>Hello</p>',
      text_content: 'Hello',
      segment: 'all_users',
      segment_filters: null,
      scheduled_at: null,
      status: 'draft',
      send_count: 0,
      open_count: 0,
      click_count: 0,
      unsubscribe_count: 0,
      bounce_count: 0,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z'
    });
    queryRowsMock.mockResolvedValue([
      { id: 'user-1', email: 'first@example.com' },
      { id: 'user-2', email: 'second@example.com' }
    ]);
    shouldNotifyMock.mockResolvedValue(true);
    sendEmailMock.mockResolvedValue(true);
    updateMock.mockResolvedValue({ id: 'campaign-1' });

    const { sendCampaign } = await import('../email-campaigns');
    const result = await sendCampaign('campaign-1', true);

    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'first@example.com',
      subject: 'Subject'
    }));
  });

  it('should report partial failures in campaign delivery counts', async () => {
    queryOneMock.mockResolvedValue({
      id: 'campaign-1',
      name: 'Launch',
      subject: 'Subject',
      from_name: 'Ops',
      from_email: 'ops@example.com',
      html_content: '<p>Hello</p>',
      text_content: 'Hello',
      segment: 'all_users',
      segment_filters: null,
      scheduled_at: null,
      status: 'draft',
      send_count: 0,
      open_count: 0,
      click_count: 0,
      unsubscribe_count: 0,
      bounce_count: 0,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z'
    });
    queryRowsMock.mockResolvedValue([
      { id: 'user-1', email: 'one@example.com' },
      { id: 'user-2', email: 'two@example.com' },
      { id: 'user-3', email: 'three@example.com' }
    ]);
    shouldNotifyMock
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    sendEmailMock
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    updateMock.mockResolvedValue({ id: 'campaign-1' });

    const { sendCampaign } = await import('../email-campaigns');
    const result = await sendCampaign('campaign-1', false);

    expect(result).toEqual({ sent: 1, failed: 2 });
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(updateMock).toHaveBeenLastCalledWith(
      'email_campaigns',
      { id: 'campaign-1' },
      expect.objectContaining({ status: 'completed', send_count: 1 })
    );
  });

  it('should track sent events with original campaign id type', async () => {
    queryOneMock.mockResolvedValue({
      id: 'campaign-1',
      name: 'Launch',
      subject: 'Subject',
      from_name: 'Ops',
      from_email: 'ops@example.com',
      html_content: '<p>Hello</p>',
      text_content: 'Hello',
      segment: 'all_users',
      segment_filters: null,
      scheduled_at: null,
      status: 'draft',
      send_count: 0,
      open_count: 0,
      click_count: 0,
      unsubscribe_count: 0,
      bounce_count: 0,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z'
    });
    queryRowsMock.mockResolvedValue([{ id: 'user-1', email: 'one@example.com' }]);
    shouldNotifyMock.mockResolvedValue(true);
    sendEmailMock.mockResolvedValue(true);
    updateMock.mockResolvedValue({ id: 'campaign-1' });

    const { sendCampaign } = await import('../email-campaigns');
    await sendCampaign('campaign-1', false);

    expect(queryOneMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO campaign_tracking'),
      ['campaign-1', 'user-1', 'sent', null]
    );
  });

  it('should return false when tracking insert fails', async () => {
    queryOneMock.mockRejectedValueOnce(new Error('db down'));
    const { trackCampaignEvent } = await import('../email-campaigns');

    const result = await trackCampaignEvent('campaign-1', 'user-1', 'open');
    expect(result).toBe(false);
  });

  it('should skip aggregate update for unknown tracking event types', async () => {
    queryOneMock.mockResolvedValue({ id: 'tracked-1' });
    const { trackCampaignEvent } = await import('../email-campaigns');

    const result = await trackCampaignEvent('campaign-1', 'user-1', 'delivered');

    expect(result).toBe(true);
    expect(queryOneMock).toHaveBeenCalledTimes(1);
    expect(queryOneMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO campaign_tracking'),
      ['campaign-1', 'user-1', 'delivered', null]
    );
  });
});
