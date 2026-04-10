export function hashString(value: string): number {
  return Array.from(value).reduce((hash, char, index) => {
    return (hash + char.charCodeAt(0) * (index + 17)) % 2147483647;
  }, 0);
}

export function normalize(hash: number, min: number, max: number): number {
  if (max <= min) return min;
  const ratio = (Math.abs(hash) % 10000) / 10000;
  return min + (max - min) * ratio;
}

export function round(value: number, digits: number = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function pickDeterministic<T>(items: T[], seed: string): T {
  return items[hashString(seed) % items.length];
}

export function deterministicId(prefix: string, seed: string, counter: number): string {
  const suffix = (hashString(seed) % 1679616).toString(36).padStart(4, '0');
  return `${prefix}-${counter.toString(36).padStart(4, '0')}-${suffix}`;
}
