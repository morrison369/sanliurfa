export function resolveEnvelopeData(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return {};

  const direct = payload as Record<string, unknown>;
  const outerData = direct.data;
  if (outerData && typeof outerData === 'object') {
    return outerData as Record<string, unknown>;
  }

  return direct;
}

export function resolveNestedEnvelopeData(payload: unknown): Record<string, unknown> {
  const firstPass = resolveEnvelopeData(payload);
  const nestedData = firstPass.data;

  if (nestedData && typeof nestedData === 'object') {
    return nestedData as Record<string, unknown>;
  }

  return firstPass;
}

export function extractEnvelopeMessage(payload: unknown, fallback: string): string {
  const candidates: unknown[] = [
    resolveNestedEnvelopeData(payload).message,
    resolveEnvelopeData(payload).message,
  ];

  if (payload && typeof payload === 'object') {
    const error = (payload as { error?: unknown }).error;
    candidates.push(error);

    if (error && typeof error === 'object') {
      candidates.push((error as { message?: unknown }).message);
    }
  }

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return fallback;
}
