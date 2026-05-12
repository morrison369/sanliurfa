/**
 * Şanlıurfa.com varsayılan OG image oluşturucu.
 * Sharp ile SVG → PNG (1200×630) dönüşümü.
 * Çıktı: public/og-image.png
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'public', 'og-image.png');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a0e08;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#2d1a0d;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0d1a15;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="copper" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#CE8E38;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#e8b87a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#CE8E38;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="green" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#2C7A52;stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:#3d9e6a;stop-opacity:0.8" />
    </linearGradient>
  </defs>

  <!-- Arkaplan -->
  <rect width="1200" height="630" fill="url(#bg)" />

  <!-- Dekoratif geometrik desenler — Harran damgası -->
  <circle cx="100" cy="100" r="200" fill="none" stroke="#CE8E38" stroke-width="1" opacity="0.15" />
  <circle cx="100" cy="100" r="150" fill="none" stroke="#CE8E38" stroke-width="1" opacity="0.1" />
  <circle cx="1100" cy="530" r="250" fill="none" stroke="#2C7A52" stroke-width="1" opacity="0.12" />
  <circle cx="1100" cy="530" r="180" fill="none" stroke="#2C7A52" stroke-width="1" opacity="0.08" />

  <!-- Üst ince çizgi (bakır) -->
  <rect x="0" y="0" width="1200" height="4" fill="url(#copper)" />

  <!-- Alt ince çizgi (yeşil) -->
  <rect x="0" y="626" width="1200" height="4" fill="url(#green)" />

  <!-- Sol dikey aksent çizgi -->
  <rect x="80" y="140" width="3" height="350" fill="url(#copper)" opacity="0.7" />

  <!-- Ana başlık: Şanlıurfa -->
  <text x="120" y="295"
    font-family="Georgia, serif"
    font-size="96"
    font-style="italic"
    font-weight="400"
    fill="url(#copper)"
    letter-spacing="-2">Şanlıurfa</text>

  <!-- Alt başlık -->
  <text x="122" y="355"
    font-family="Arial, Helvetica, sans-serif"
    font-size="28"
    font-weight="300"
    fill="#d4b896"
    letter-spacing="8">MEKANLAR · KÜLTÜR · LEZZET</text>

  <!-- Ayırıcı çizgi -->
  <rect x="120" y="380" width="480" height="1" fill="#CE8E38" opacity="0.5" />

  <!-- Slogan -->
  <text x="120" y="420"
    font-family="Arial, Helvetica, sans-serif"
    font-size="20"
    font-weight="300"
    fill="#a08060"
    letter-spacing="2">Peygamberler şehrine kapsamlı rehberiniz</text>

  <!-- Domain badge -->
  <rect x="120" y="460" width="200" height="48" rx="4" fill="#CE8E38" opacity="0.15" />
  <rect x="120" y="460" width="200" height="48" rx="4" fill="none" stroke="#CE8E38" stroke-width="1" opacity="0.4" />
  <text x="220" y="491"
    font-family="Arial, Helvetica, sans-serif"
    font-size="18"
    font-weight="600"
    fill="#CE8E38"
    text-anchor="middle"
    letter-spacing="1">sanliurfa.com</text>

  <!-- Sağ dekoratif alan: rakam vurguları -->
  <text x="900" y="240"
    font-family="Georgia, serif"
    font-size="120"
    font-weight="700"
    fill="#CE8E38"
    text-anchor="middle"
    opacity="0.12">533</text>
  <text x="900" y="270"
    font-family="Arial, Helvetica, sans-serif"
    font-size="16"
    fill="#CE8E38"
    text-anchor="middle"
    opacity="0.6"
    letter-spacing="3">MEKAN</text>

  <text x="900" y="370"
    font-family="Georgia, serif"
    font-size="80"
    font-weight="700"
    fill="#2C7A52"
    text-anchor="middle"
    opacity="0.15">66</text>
  <text x="900" y="395"
    font-family="Arial, Helvetica, sans-serif"
    font-size="14"
    fill="#2C7A52"
    text-anchor="middle"
    opacity="0.5"
    letter-spacing="3">TARİF</text>

  <text x="1060" y="310"
    font-family="Georgia, serif"
    font-size="90"
    font-weight="700"
    fill="#CE8E38"
    text-anchor="middle"
    opacity="0.1">20</text>
  <text x="1060" y="335"
    font-family="Arial, Helvetica, sans-serif"
    font-size="13"
    fill="#CE8E38"
    text-anchor="middle"
    opacity="0.4"
    letter-spacing="3">TARİHİ YER</text>
</svg>`;

const svgBuffer = Buffer.from(svg);

await sharp(svgBuffer)
  .png({ compressionLevel: 9, quality: 95 })
  .resize(1200, 630, { fit: 'fill' })
  .toFile(OUT);

const size = fs.statSync(OUT).size;
console.log(`✓ OG image oluşturuldu: ${OUT}`);
console.log(`  Boyut: ${(size / 1024).toFixed(1)} KB`);
console.log(`  Boyutlar: 1200×630px`);
