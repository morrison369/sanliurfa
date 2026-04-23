import { createHash } from 'crypto';

const IP_HEADERS = ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip', 'true-client-ip'] as const;

function normalizeIpCandidate(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.toLowerCase() === 'unknown') {
    return null;
  }

  // x-forwarded-for entries may include port; drop port for IPv4 values.
  const maybeIpv4WithPort = trimmed.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/);
  if (maybeIpv4WithPort) {
    return maybeIpv4WithPort[1];
  }

  return trimmed;
}

function buildAnonymousFingerprint(request: Request): string {
  const source = [
    request.headers.get('user-agent') || '',
    request.headers.get('sec-ch-ua-platform') || '',
    request.headers.get('sec-ch-ua-mobile') || '',
    request.headers.get('host') || '',
    new URL(request.url).pathname
  ].join('|');

  return createHash('sha256').update(source).digest('hex').slice(0, 16);
}

export function getClientIdentifier(request: Request): string {
  for (const headerName of IP_HEADERS) {
    const headerValue = request.headers.get(headerName);
    if (!headerValue) {
      continue;
    }

    const parts = headerName === 'x-forwarded-for' ? headerValue.split(',') : [headerValue];
    for (const part of parts) {
      const normalized = normalizeIpCandidate(part);
      if (normalized) {
        return normalized;
      }
    }
  }

  return `anon:${buildAnonymousFingerprint(request)}`;
}
