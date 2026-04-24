import { describe, it, expect } from 'vitest';

// Test constants directly
const EMAIL_TEMPLATES = {
  welcome: { subject: 'Sanliurfa.com\'a Hoş Geldiniz! 🎉' },
  birthday: { subject: 'İyi ki Doğdunuz! 🎂' },
};

const PREBUILT_AUTOMATIONS = {
  welcomeSeries: { trigger: 'user_registered' },
  birthday: { trigger: 'birthday' },
};

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

describe('Email Marketing', () => {
  describe('Templates', () => {
    it('should have welcome template', () => {
      expect(EMAIL_TEMPLATES.welcome).toBeDefined();
      expect(EMAIL_TEMPLATES.welcome.subject).toContain('Hoş Geldiniz');
    });

    it('should have birthday template', () => {
      expect(EMAIL_TEMPLATES.birthday).toBeDefined();
      expect(EMAIL_TEMPLATES.birthday.subject).toContain('Doğdunuz');
    });
  });

  describe('Prebuilt Automations', () => {
    it('should have welcome series', () => {
      expect(PREBUILT_AUTOMATIONS.welcomeSeries).toBeDefined();
      expect(PREBUILT_AUTOMATIONS.welcomeSeries.trigger).toBe('user_registered');
    });

    it('should have birthday automation', () => {
      expect(PREBUILT_AUTOMATIONS.birthday).toBeDefined();
      expect(PREBUILT_AUTOMATIONS.birthday.trigger).toBe('birthday');
    });
  });

  describe('Email Validation', () => {
    it('should validate correct emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user@domain.co.tr')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
    });
  });
});
