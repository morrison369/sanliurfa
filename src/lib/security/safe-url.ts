/**
 * Safe External URL Validator — HARD RULE #33 (SSRF defense)
 *
 * Validates user-supplied URLs that the server will later fetch (webhooks,
 * callbacks, image proxies, scrapers). Rejects:
 *   - Non-HTTP(S) protocols: file://, ftp://, gopher://, javascript:, data:
 *   - Loopback addresses: 127.0.0.0/8, ::1, localhost
 *   - Link-local addresses: 169.254.0.0/16 (AWS/GCP/Azure metadata service)
 *   - Private IP ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
 *   - Reserved/test ranges: 0.0.0.0/8, 224.0.0.0/4, 240.0.0.0/4
 *   - URL credentials (http://user:pass@host) — malformed input vector
 *   - Standard ports of internal services (Postgres 5432, Redis 6379, etc.)
 *     when explicitly listed
 *
 * Returns `{ ok: true, url: URL }` for safe URLs, `{ ok: false, reason: string }`
 * otherwise. Reason strings are stable identifiers suitable for logging.
 *
 * Note: This is hostname-based validation only. For full SSRF defense against
 * DNS rebinding, callers should resolve the hostname → IP at fetch time and
 * re-validate the IP. That hardening is out of scope for this helper (would
 * require custom HTTP agent).
 */

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

// Block standard ports of common internal services even on public hosts —
// defense against attacker pointing webhook to scanme.example.com:5432 or
// using a CNAME redirect to internal infrastructure.
const BLOCKED_PORTS = new Set([
  '22',    // SSH
  '23',    // Telnet
  '25',    // SMTP
  '53',    // DNS
  '110',   // POP3
  '143',   // IMAP
  '445',   // SMB
  '465',   // SMTPS
  '587',   // SMTP submission
  '993',   // IMAPS
  '995',   // POP3S
  '1433',  // MSSQL
  '3306',  // MySQL
  '3389',  // RDP
  '5432',  // PostgreSQL
  '5984',  // CouchDB
  '6379',  // Redis
  '9042',  // Cassandra
  '9200',  // Elasticsearch
  '9300',  // Elasticsearch transport
  '11211', // Memcached
  '15672', // RabbitMQ management
  '27017', // MongoDB
  '50070', // Hadoop NameNode
]);

export interface SafeUrlResult {
  ok: boolean;
  url?: URL;
  reason?: string;
}

export function validateExternalUrl(input: unknown): SafeUrlResult {
  if (typeof input !== 'string' || input.length === 0) {
    return { ok: false, reason: 'invalid_input' };
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: 'malformed_url' };
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    return { ok: false, reason: 'forbidden_protocol' };
  }

  // URL credentials (http://user:pass@host) are an injection vector and
  // legitimate use cases are extremely rare for webhooks/callbacks.
  if (url.username !== '' || url.password !== '') {
    return { ok: false, reason: 'url_credentials_forbidden' };
  }

  if (url.port !== '' && BLOCKED_PORTS.has(url.port)) {
    return { ok: false, reason: 'blocked_port' };
  }

  // URL.hostname keeps IPv6 brackets (`[fc00::1]`). Strip for downstream checks.
  let hostname = url.hostname.toLowerCase();
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    hostname = hostname.slice(1, -1);
  }

  if (isBlockedHostname(hostname)) {
    return { ok: false, reason: 'blocked_hostname' };
  }

  if (isPrivateIp(hostname)) {
    return { ok: false, reason: 'private_ip' };
  }

  return { ok: true, url };
}

function isBlockedHostname(hostname: string): boolean {
  // Direct localhost variants
  if (hostname === 'localhost' || hostname === 'localhost.localdomain') return true;
  // IPv6 loopback in URL form is `[::1]` → URL.hostname strips brackets
  if (hostname === '::1' || hostname === '0:0:0:0:0:0:0:1') return true;
  // IPv4 mapped IPv6 loopback
  if (hostname.startsWith('::ffff:127.')) return true;
  return false;
}

function isPrivateIp(hostname: string): boolean {
  // IPv4 dotted-decimal check
  const ipv4 = parseIpv4(hostname);
  if (ipv4 !== null) {
    const [a, b] = ipv4;
    // 0.0.0.0/8 — current network
    if (a === 0) return true;
    // 10.0.0.0/8 — private
    if (a === 10) return true;
    // 100.64.0.0/10 — shared address space (CGN)
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 127.0.0.0/8 — loopback
    if (a === 127) return true;
    // 169.254.0.0/16 — link-local + cloud metadata service
    if (a === 169 && b === 254) return true;
    // 172.16.0.0/12 — private
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.0.0.0/24 — IETF protocol assignments
    if (a === 192 && b === 0) return true;
    // 192.168.0.0/16 — private
    if (a === 192 && b === 168) return true;
    // 198.18.0.0/15 — benchmark testing
    if (a === 198 && (b === 18 || b === 19)) return true;
    // 224.0.0.0/4 — multicast
    if (a >= 224 && a <= 239) return true;
    // 240.0.0.0/4 — reserved
    if (a >= 240) return true;
    return false;
  }

  // IPv6 quick checks (URL.hostname strips brackets)
  if (hostname.includes(':')) {
    const lower = hostname.toLowerCase();
    // ::1 loopback
    if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;
    // fe80::/10 — link-local
    if (lower.startsWith('fe80:') || lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;
    // fc00::/7 — unique local addresses
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    // ff00::/8 — multicast
    if (lower.startsWith('ff')) return true;
  }

  return false;
}

function parseIpv4(hostname: string): [number, number, number, number] | null {
  const parts = hostname.split('.');
  if (parts.length !== 4) return null;
  const nums: number[] = [];
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    nums.push(n);
  }
  return nums as [number, number, number, number];
}
