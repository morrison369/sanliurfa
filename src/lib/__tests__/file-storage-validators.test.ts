/**
 * Unit Tests - file/file-storage.ts validators (pure)
 *
 * - validateImageSignature (magic bytes check for JPEG/PNG/WebP/GIF)
 * - validateFileExtension (BLOCKED_EXTENSIONS allowlist - exe/bat/sh/php/js/svg etc)
 *
 * NOT: saveFile/deleteFile fs-bound, kapsam dışı.
 */

import { describe, it, expect } from 'vitest';
import { validateImageSignature, validateFileExtension } from '../file/file-storage';

describe('validateImageSignature - magic bytes check', () => {
  it('JPEG - 0xFF 0xD8 0xFF (SOI marker) → true', () => {
    const buf = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
    expect(validateImageSignature(buf, 'image/jpeg')).toBe(true);
  });

  it('PNG - 0x89 0x50 0x4E 0x47 (signature) → true', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
    expect(validateImageSignature(buf, 'image/png')).toBe(true);
  });

  it('WebP - "RIFF...WEBP" container → true', () => {
    const buf = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
    expect(validateImageSignature(buf, 'image/webp')).toBe(true);
  });

  it('GIF - 0x47 0x49 0x46 0x38 (GIF8) → true', () => {
    const buf = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    expect(validateImageSignature(buf, 'image/gif')).toBe(true);
  });

  it('JPEG header but mime image/png → false (mime mismatch)', () => {
    const buf = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
    expect(validateImageSignature(buf, 'image/png')).toBe(false);
  });

  it('Buffer < 12 bytes → false (too short)', () => {
    const buf = Buffer.from([0xFF, 0xD8]);
    expect(validateImageSignature(buf, 'image/jpeg')).toBe(false);
  });

  it('Unknown mime → false (no entry in switch)', () => {
    const buf = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
    expect(validateImageSignature(buf, 'image/unknown')).toBe(false);
  });

  it('Empty buffer → false', () => {
    expect(validateImageSignature(Buffer.from([]), 'image/jpeg')).toBe(false);
  });
});

describe('validateFileExtension - BLOCKED_EXTENSIONS allowlist', () => {
  it('safe extension - jpg/png/pdf → true', () => {
    expect(validateFileExtension('photo.jpg')).toBe(true);
    expect(validateFileExtension('image.png')).toBe(true);
    expect(validateFileExtension('document.pdf')).toBe(true);
  });

  it('exe/bat/sh - executable → false', () => {
    expect(validateFileExtension('malware.exe')).toBe(false);
    expect(validateFileExtension('script.bat')).toBe(false);
    expect(validateFileExtension('shell.sh')).toBe(false);
  });

  it('script extensions js/mjs/php/py → false', () => {
    expect(validateFileExtension('inject.js')).toBe(false);
    expect(validateFileExtension('module.mjs')).toBe(false);
    expect(validateFileExtension('exploit.php')).toBe(false);
    expect(validateFileExtension('script.py')).toBe(false);
  });

  it('SVG (XSS via embedded script) → false', () => {
    expect(validateFileExtension('vector.svg')).toBe(false);
  });

  it('HTML/HTM → false', () => {
    expect(validateFileExtension('page.html')).toBe(false);
    expect(validateFileExtension('legacy.htm')).toBe(false);
  });

  it('Case insensitive - .EXE → false', () => {
    expect(validateFileExtension('MALWARE.EXE')).toBe(false);
  });

  it('No extension → true (default safe)', () => {
    expect(validateFileExtension('README')).toBe(true);
  });
});
