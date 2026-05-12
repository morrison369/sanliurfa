/**
 * Unit Tests — notification/notifications.ts NotificationSystem class (Phase 22)
 *
 * - registerTemplate / schedule / send pipeline
 * - trackOpen / trackClick (deliveryId lookup)
 * - getHistory (per-user delivery list)
 * - registerABTest / recordWin / getABTestResults (variant winner logic)
 * - getOpenRate / getClickThroughRate (denominator guards)
 *
 * Singleton state shared — testler unique templateId/userId/testId kullanır.
 */

import { describe, it, expect } from 'vitest';
import { notificationSystem } from '../notification/notifications';

describe('NotificationSystem', () => {
  it('schedule — id prefix notif- + status pending + scheduledFor future', () => {
    const tplId = `tpl-${Date.now()}-1`;
    notificationSystem.registerTemplate({
      id: tplId,
      name: 'welcome',
      type: 'email',
      subject: 'Hi',
      body: 'Hello {name}',
      variables: ['name'],
    });
    const n = notificationSystem.schedule('u-1', tplId, { name: 'Ali' }, 1000);
    expect(n.id.startsWith('notif-')).toBe(true);
    expect(n.status).toBe('pending');
    expect(n.scheduledFor).toBeGreaterThan(Date.now());
  });

  it('send — bilinmeyen notification → null', async () => {
    const result = await notificationSystem.send('non-existent');
    expect(result).toBeNull();
  });

  it('send — bilinmeyen template → null (template missing)', async () => {
    const tplId = `non-existent-tpl-${Date.now()}`;
    const n = notificationSystem.schedule('u-2', tplId, {}, 0);
    const result = await notificationSystem.send(n.id);
    expect(result).toBeNull();
  });

  it('send — başarılı → delivery record + status sent', async () => {
    const tplId = `tpl-${Date.now()}-2`;
    notificationSystem.registerTemplate({
      id: tplId,
      name: 'send-test',
      type: 'sms',
      body: 'Hi',
      variables: [],
    });
    const n = notificationSystem.schedule('u-send', tplId, {}, 0);
    const delivery = await notificationSystem.send(n.id);
    expect(delivery?.status).toBe('delivered');
    expect(delivery?.type).toBe('sms');
  });

  it('getHistory — bilinmeyen user → []', () => {
    expect(notificationSystem.getHistory(`non-user-${Date.now()}`)).toEqual([]);
  });

  it('getHistory — kayıt sonrası delivery listesi', async () => {
    const tplId = `tpl-${Date.now()}-3`;
    notificationSystem.registerTemplate({ id: tplId, name: 'hist', type: 'email', body: 'x', variables: [] });
    const n = notificationSystem.schedule('u-hist', tplId, {}, 0);
    await notificationSystem.send(n.id);
    expect(notificationSystem.getHistory('u-hist').length).toBeGreaterThanOrEqual(1);
  });

  it('trackOpen — delivery status → opened + openedAt set', async () => {
    const tplId = `tpl-${Date.now()}-4`;
    notificationSystem.registerTemplate({ id: tplId, name: 't', type: 'email', body: 'x', variables: [] });
    const n = notificationSystem.schedule('u-open', tplId, {}, 0);
    const d = await notificationSystem.send(n.id);
    notificationSystem.trackOpen(d!.id);
    const history = notificationSystem.getHistory('u-open');
    const found = history.find((h) => h.id === d!.id);
    expect(found?.status).toBe('opened');
    expect(found?.openedAt).toBeGreaterThan(0);
  });

  it('trackClick — clickedAt set (status değişmez)', async () => {
    const tplId = `tpl-${Date.now()}-5`;
    notificationSystem.registerTemplate({ id: tplId, name: 't', type: 'email', body: 'x', variables: [] });
    const n = notificationSystem.schedule('u-click', tplId, {}, 0);
    const d = await notificationSystem.send(n.id);
    notificationSystem.trackClick(d!.id);
    const found = notificationSystem.getHistory('u-click').find((h) => h.id === d!.id);
    expect(found?.clickedAt).toBeGreaterThan(0);
  });

  it('registerABTest + recordWin + getABTestResults — variant1 winner', () => {
    const TID = `ab-${Date.now()}-1`;
    notificationSystem.registerABTest(TID, 'subject-A', 'subject-B');
    notificationSystem.recordWin(TID, 'variant1');
    notificationSystem.recordWin(TID, 'variant1');
    notificationSystem.recordWin(TID, 'variant2');
    const r = notificationSystem.getABTestResults(TID);
    expect(r?.winner).toBe('variant1');
    expect(r?.variant1Rate).toBeGreaterThan(0.5);
  });

  it('getABTestResults — bilinmeyen testId → null', () => {
    expect(notificationSystem.getABTestResults('non-existent')).toBeNull();
  });

  it('getOpenRate — delivery yok → 0 (denominator guard)', () => {
    expect(notificationSystem.getOpenRate(`no-deliveries-${Date.now()}`)).toBe(0);
  });

  it('getOpenRate — opened ratio', async () => {
    const tplId = `tpl-${Date.now()}-6`;
    notificationSystem.registerTemplate({ id: tplId, name: 't', type: 'email', body: 'x', variables: [] });
    const n = notificationSystem.schedule('u-rate', tplId, {}, 0);
    const d = await notificationSystem.send(n.id);
    notificationSystem.trackOpen(d!.id);
    expect(notificationSystem.getOpenRate('u-rate')).toBeGreaterThan(0);
  });

  it('getClickThroughRate — clicked ratio + denominator guard', () => {
    expect(notificationSystem.getClickThroughRate(`no-clicks-${Date.now()}`)).toBe(0);
  });
});
