import { describe, expect, it } from 'vitest';
import { validateSiteSetting } from '../site-settings-schema';
import { validateSiteSettingWithZod } from '../site-settings-zod';

const validAutoActions = {
  enabled: true,
  cooldownMinutes: 60,
  note: 'social_risk_auto_action',
  rollbackToDefaultWhenHealthy: true,
  profile: {
    swipeLimit: 60,
    swipeWindowSeconds: 60,
    followLimit: 30,
    followWindowSeconds: 60,
    messageWriteLimit: 40,
    messageWriteWindowSeconds: 60,
  },
};

describe('site settings social.risk.autoActions validation', () => {
  it('accepts valid autoActions payload in schema validator', () => {
    const result = validateSiteSetting('social.risk.autoActions', validAutoActions);
    expect(result.ok).toBe(true);
  });

  it('rejects invalid rollback flag type in schema validator', () => {
    const result = validateSiteSetting('social.risk.autoActions', {
      ...validAutoActions,
      rollbackToDefaultWhenHealthy: 'true',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('rollbackToDefaultWhenHealthy');
    }
  });

  it('accepts valid autoActions payload in zod validator', () => {
    const result = validateSiteSettingWithZod('social.risk.autoActions', validAutoActions);
    expect(result.ok).toBe(true);
  });

  it('rejects invalid profile value type in zod validator', () => {
    const result = validateSiteSettingWithZod('social.risk.autoActions', {
      ...validAutoActions,
      profile: {
        ...validAutoActions.profile,
        messageWriteWindowSeconds: '60',
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.toLowerCase()).toContain('expected number');
    }
  });
});
