function escapePdfText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, ' ');
}

function stripHtml(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function renderFallbackPdf(text: string): Buffer {
  const safe = escapePdfText(text).slice(0, 2400);
  const stream = `BT /F1 12 Tf 40 760 Td (${safe}) Tj ET`;
  const obj1 = '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n';
  const obj2 = '2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj\n';
  const obj3 =
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n';
  const obj4 = '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n';
  const obj5 = `5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj\n`;
  return Buffer.from(`%PDF-1.4\n${obj1}${obj2}${obj3}${obj4}${obj5}`, 'utf8');
}

export async function renderPdfFromHtml(html: string): Promise<Buffer> {
  try {
    const playwright = await import('playwright');
    const browser = await playwright.chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      await page.setContent(html, { waitUntil: 'networkidle' });
      return await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' },
      });
    } finally {
      await browser.close();
    }
  } catch {
    return renderFallbackPdf(stripHtml(html));
  }
}

