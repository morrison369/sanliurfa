/**
 * Unit tests for `validateExternalUrl()` — HARD RULE #33 helper.
 *
 * Validates SSRF defense for user-supplied URLs that the server fetches.
 */

import { describe, it, expect } from 'vitest';
import { validateExternalUrl } from '../security/safe-url';

describe('validateExternalUrl()', () => {
  describe('safe public URLs (accepted)', () => {
    it('accepts plain https public URL', () => {
      const r = validateExternalUrl('https://example.com/webhook');
      expect(r.ok).toBe(true);
      expect(r.url?.hostname).toBe('example.com');
    });

    it('accepts plain http public URL', () => {
      const r = validateExternalUrl('http://api.partner.io/hook');
      expect(r.ok).toBe(true);
    });

    it('accepts URL with non-blocked port', () => {
      const r = validateExternalUrl('https://example.com:8080/webhook');
      expect(r.ok).toBe(true);
    });

    it('accepts URL with path + query + fragment', () => {
      const r = validateExternalUrl('https://api.example.com/v1/hooks?token=abc#frag');
      expect(r.ok).toBe(true);
    });

    it('accepts subdomain with hyphen', () => {
      const r = validateExternalUrl('https://my-app-prod.partner.example/x');
      expect(r.ok).toBe(true);
    });
  });

  describe('invalid input', () => {
    it('rejects null', () => {
      expect(validateExternalUrl(null).ok).toBe(false);
      expect(validateExternalUrl(null).reason).toBe('invalid_input');
    });

    it('rejects undefined', () => {
      expect(validateExternalUrl(undefined).ok).toBe(false);
    });

    it('rejects empty string', () => {
      expect(validateExternalUrl('').ok).toBe(false);
      expect(validateExternalUrl('').reason).toBe('invalid_input');
    });

    it('rejects non-string types', () => {
      expect(validateExternalUrl(42).ok).toBe(false);
      expect(validateExternalUrl({}).ok).toBe(false);
    });

    it('rejects malformed URL', () => {
      expect(validateExternalUrl('not a url').ok).toBe(false);
      expect(validateExternalUrl('not a url').reason).toBe('malformed_url');
    });
  });

  describe('forbidden protocols', () => {
    it('rejects file://', () => {
      const r = validateExternalUrl('file:///etc/passwd');
      expect(r.ok).toBe(false);
      expect(r.reason).toBe('forbidden_protocol');
    });

    it('rejects ftp://', () => {
      expect(validateExternalUrl('ftp://example.com/').reason).toBe('forbidden_protocol');
    });

    it('rejects gopher://', () => {
      expect(validateExternalUrl('gopher://example.com/').reason).toBe('forbidden_protocol');
    });

    it('rejects javascript:', () => {
      expect(validateExternalUrl('javascript:alert(1)').reason).toBe('forbidden_protocol');
    });

    it('rejects data:', () => {
      expect(validateExternalUrl('data:text/html,<script>').reason).toBe('forbidden_protocol');
    });
  });

  describe('URL credentials (injection vector)', () => {
    it('rejects http://user:pass@host', () => {
      const r = validateExternalUrl('http://admin:secret@example.com/');
      expect(r.ok).toBe(false);
      expect(r.reason).toBe('url_credentials_forbidden');
    });

    it('rejects http://user@host', () => {
      expect(validateExternalUrl('http://admin@example.com/').reason).toBe('url_credentials_forbidden');
    });
  });

  describe('blocked ports (internal services)', () => {
    it('rejects PostgreSQL :5432', () => {
      expect(validateExternalUrl('http://example.com:5432/').reason).toBe('blocked_port');
    });

    it('rejects Redis :6379', () => {
      expect(validateExternalUrl('http://example.com:6379/').reason).toBe('blocked_port');
    });

    it('rejects MongoDB :27017', () => {
      expect(validateExternalUrl('http://example.com:27017/').reason).toBe('blocked_port');
    });

    it('rejects SSH :22', () => {
      expect(validateExternalUrl('http://example.com:22/').reason).toBe('blocked_port');
    });

    it('rejects MySQL :3306', () => {
      expect(validateExternalUrl('http://example.com:3306/').reason).toBe('blocked_port');
    });
  });

  describe('loopback hostnames', () => {
    it('rejects localhost', () => {
      expect(validateExternalUrl('http://localhost/').reason).toBe('blocked_hostname');
    });

    it('rejects localhost.localdomain', () => {
      expect(validateExternalUrl('http://localhost.localdomain/').reason).toBe('blocked_hostname');
    });

    it('rejects [::1] IPv6 loopback', () => {
      // Note: URL strips brackets from hostname
      expect(validateExternalUrl('http://[::1]/').ok).toBe(false);
    });
  });

  describe('private IPv4 ranges', () => {
    it('rejects 127.0.0.1 (loopback)', () => {
      expect(validateExternalUrl('http://127.0.0.1/').reason).toBe('private_ip');
    });

    it('rejects 10.0.0.1 (RFC 1918)', () => {
      expect(validateExternalUrl('http://10.0.0.1/').reason).toBe('private_ip');
    });

    it('rejects 10.255.255.255 (RFC 1918 edge)', () => {
      expect(validateExternalUrl('http://10.255.255.255/').reason).toBe('private_ip');
    });

    it('rejects 172.16.0.1 (RFC 1918 start)', () => {
      expect(validateExternalUrl('http://172.16.0.1/').reason).toBe('private_ip');
    });

    it('rejects 172.31.255.255 (RFC 1918 end)', () => {
      expect(validateExternalUrl('http://172.31.255.255/').reason).toBe('private_ip');
    });

    it('accepts 172.32.0.1 (just outside RFC 1918)', () => {
      expect(validateExternalUrl('http://172.32.0.1/').ok).toBe(true);
    });

    it('rejects 192.168.0.1 (RFC 1918)', () => {
      expect(validateExternalUrl('http://192.168.0.1/').reason).toBe('private_ip');
    });

    it('rejects 169.254.169.254 (AWS metadata)', () => {
      expect(validateExternalUrl('http://169.254.169.254/latest/meta-data/').reason).toBe('private_ip');
    });

    it('rejects 169.254.0.1 (link-local)', () => {
      expect(validateExternalUrl('http://169.254.0.1/').reason).toBe('private_ip');
    });

    it('rejects 0.0.0.0 (current network)', () => {
      expect(validateExternalUrl('http://0.0.0.0/').reason).toBe('private_ip');
    });

    it('rejects 100.64.0.1 (CGN shared)', () => {
      expect(validateExternalUrl('http://100.64.0.1/').reason).toBe('private_ip');
    });

    it('accepts 100.63.255.255 (just outside CGN)', () => {
      expect(validateExternalUrl('http://100.63.255.255/').ok).toBe(true);
    });

    it('rejects 224.0.0.1 (multicast)', () => {
      expect(validateExternalUrl('http://224.0.0.1/').reason).toBe('private_ip');
    });

    it('rejects 240.0.0.1 (reserved)', () => {
      expect(validateExternalUrl('http://240.0.0.1/').reason).toBe('private_ip');
    });
  });

  describe('IPv6 private ranges', () => {
    it('rejects fc00:: (unique local)', () => {
      expect(validateExternalUrl('http://[fc00::1]/').reason).toBe('private_ip');
    });

    it('rejects fd00:: (unique local)', () => {
      expect(validateExternalUrl('http://[fd00::1]/').reason).toBe('private_ip');
    });

    it('rejects fe80:: (link-local)', () => {
      expect(validateExternalUrl('http://[fe80::1]/').reason).toBe('private_ip');
    });

    it('rejects ff02:: (multicast)', () => {
      expect(validateExternalUrl('http://[ff02::1]/').reason).toBe('private_ip');
    });
  });

  describe('edge cases', () => {
    it('accepts uppercase hostname', () => {
      expect(validateExternalUrl('https://EXAMPLE.COM/').ok).toBe(true);
    });

    it('rejects mixed-case localhost', () => {
      expect(validateExternalUrl('http://LOCALHOST/').ok).toBe(false);
    });

    it('rejects mixed-case 169.254 metadata', () => {
      expect(validateExternalUrl('http://169.254.169.254:80/').reason).toBe('private_ip');
    });
  });
});
