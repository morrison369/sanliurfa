type ResolveImageInput = {
  category: string;
  slug?: string | null;
  explicit?: string | null;
  placeholder: string;
  thumb?: boolean;
};

const SAFE_CATEGORY_RE = /^[a-z0-9-]+$/;
const SAFE_SLUG_RE = /^[a-z0-9-]+$/;

function sanitizeSegment(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized;
}

function isAcceptableExplicit(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/images/') ||
    trimmed.startsWith('/uploads/')
  );
}

export function buildSlugImagePath(category: string, slug: string, thumb = false): string | null {
  const safeCategory = sanitizeSegment(category);
  const safeSlug = sanitizeSegment(slug);
  if (!safeCategory || !safeSlug) return null;
  if (!SAFE_CATEGORY_RE.test(safeCategory) || !SAFE_SLUG_RE.test(safeSlug)) return null;
  return `/images/${safeCategory}/${safeSlug}${thumb ? '-thumb' : ''}.jpg`;
}

export function resolveContentImage(input: ResolveImageInput): string {
  const explicit = sanitizeSegment(input.explicit || undefined);
  if (explicit && isAcceptableExplicit(explicit)) {
    return input.explicit!.trim();
  }

  const slug = sanitizeSegment(input.slug || undefined);
  if (slug) {
    const generated = buildSlugImagePath(input.category, slug, input.thumb === true);
    if (generated) return generated;
  }

  return input.placeholder;
}
