/**
 * Unit Tests — image-optimization.ts pure helpers
 *
 * - generateSrcSet: width × format → "url-width.format width" CSS srcset
 * - generateSizes: breakpoint → "(max-width: Npx) Xvw, ..." CSS sizes
 * - generateSVGPlaceholder: SVG data URI placeholder
 * - calculateOptimalWidth: container × DPR → ideal standard width
 * - getLoadingAttributes: priority → loading + fetchPriority
 * - getBlurPlaceholderUrl: SSR → originalUrl, browser → query params
 *
 * Note: observeForLazyLoad/getImagePriority/progressiveLoad DOM-bound, skip.
 */

import { describe, it, expect } from 'vitest';
import {
  generateSrcSet,
  generateSizes,
  generateSVGPlaceholder,
  calculateOptimalWidth,
  getLoadingAttributes,
  getBlurPlaceholderUrl,
} from '../image-optimization';

describe('generateSrcSet', () => {
  it('default widths + jpg format → 6 entry srcset', () => {
    const result = generateSrcSet('/img/test.jpg');
    expect(result).toContain('320w');
    expect(result).toContain('1920w');
    expect(result.split(',')).toHaveLength(6);
  });

  it('custom widths', () => {
    const result = generateSrcSet('/img/test.jpg', [400, 800]);
    expect(result.split(',')).toHaveLength(2);
    expect(result).toContain('400w');
    expect(result).toContain('800w');
  });

  it('extension içeren URL → width pre-extension insert', () => {
    const result = generateSrcSet('/photos/place.jpg', [400]);
    expect(result).toContain('/photos/place-400.jpg');
  });

  it('extension yoksa format suffix eklenir', () => {
    const result = generateSrcSet('/photos/no-ext', [400], 'webp');
    expect(result).toContain('/photos/no-ext-400.webp');
  });

  it('format avif', () => {
    const result = generateSrcSet('/img', [400], 'avif');
    expect(result).toContain('.avif');
  });
});

describe('generateSizes', () => {
  it('default 4 breakpoint', () => {
    const result = generateSizes();
    expect(result).toContain('(max-width: 640px) 100vw');
    expect(result).toContain('(max-width: 1024px) 50vw');
    expect(result).toContain('25vw');
  });

  it('custom breakpoints', () => {
    const result = generateSizes([{ maxWidth: 500, size: '100vw' }, { size: '50vw' }]);
    expect(result).toBe('(max-width: 500px) 100vw, 50vw');
  });

  it('breakpoint maxWidth yok → sadece size', () => {
    const result = generateSizes([{ size: '50vw' }]);
    expect(result).toBe('50vw');
  });

  it('boş size filter ile atlanır', () => {
    const result = generateSizes([{ maxWidth: 500, size: '' }, { size: '100vw' }]);
    // Boş size filter ile atlanır
    expect(result).not.toContain('500px');
    expect(result).toContain('100vw');
  });
});

describe('generateSVGPlaceholder', () => {
  it('SVG data URI format', () => {
    const result = generateSVGPlaceholder(100, 50);
    expect(result).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
  });

  it('viewBox dimensions', () => {
    const result = generateSVGPlaceholder(800, 600);
    const decoded = decodeURIComponent(result);
    expect(decoded).toContain('viewBox="0 0 800 600"');
  });

  it('default color #e5e7eb gri ton', () => {
    const result = generateSVGPlaceholder(10, 10);
    expect(decodeURIComponent(result)).toContain('#e5e7eb');
  });

  it('custom color', () => {
    const result = generateSVGPlaceholder(10, 10, '#ff0000');
    expect(decodeURIComponent(result)).toContain('#ff0000');
  });
});

describe('calculateOptimalWidth', () => {
  it('container 320 + DPR 1 → 320 (en yakın standard)', () => {
    expect(calculateOptimalWidth(320, 1)).toBe(320);
  });

  it('container 320 + DPR 2 → 640 (retina)', () => {
    expect(calculateOptimalWidth(320, 2)).toBe(640);
  });

  it('container 500 + DPR 1 → 640 (en yakın >= 500)', () => {
    expect(calculateOptimalWidth(500, 1)).toBe(640);
  });

  it('container 1000 + DPR 1 → 1024', () => {
    expect(calculateOptimalWidth(1000, 1)).toBe(1024);
  });

  it('container 3000 + DPR 1 → 2560 (en büyük standart)', () => {
    expect(calculateOptimalWidth(3000, 1)).toBe(2560);
  });

  it('DPR ondalık (1.5)', () => {
    expect(calculateOptimalWidth(400, 1.5)).toBe(640); // 400*1.5=600 → 640
  });
});

describe('getLoadingAttributes', () => {
  it('high priority → loading="eager" + fetchPriority="high"', () => {
    expect(getLoadingAttributes('high')).toEqual({ loading: 'eager', fetchPriority: 'high' });
  });

  it('low priority → loading="lazy" + fetchPriority="low"', () => {
    expect(getLoadingAttributes('low')).toEqual({ loading: 'lazy', fetchPriority: 'low' });
  });
});

describe('getBlurPlaceholderUrl', () => {
  it('SSR (window undefined) → originalUrl olduğu gibi', () => {
    // Vitest Node ortamında window undefined → fallback originalUrl
    expect(getBlurPlaceholderUrl('/img/test.jpg')).toBe('/img/test.jpg');
  });

  it('SSR → query string yok', () => {
    expect(getBlurPlaceholderUrl('/img/x.jpg', 32)).toBe('/img/x.jpg');
  });
});
