/**
 * Ollama API client — Türkçe içerik üretimi.
 * Varsayılan Ollama Cloud: https://ollama.com/api
 * OLLAMA_API_KEY zorunludur.
 */

import { logger } from '../logging';

const BASE_URL = import.meta.env.OLLAMA_BASE_URL || 'https://ollama.com/api';
const API_KEY  = import.meta.env.OLLAMA_API_KEY   || '';
const MODEL    = import.meta.env.OLLAMA_MODEL      || 'gemma4:31b';
const FALLBACK = import.meta.env.OLLAMA_FALLBACK_MODEL || 'ministral-3:14b';
const IS_CLOUD = /ollama\.com/i.test(BASE_URL);

const SYSTEM_PROMPT = `Sen Şanlıurfa.com için çalışan profesyonel bir Türkçe içerik yazarısın.
Şanlıurfa şehri, ilçeleri, tarihi yerleri, mekanları ve Türk kültürü hakkında;
- SEO uyumlu, anahtar kelime zengin
- Doğal ve akıcı Türkçe ile
- Özgün ve bilgilendirici
içerikler yazıyorsun. Markdown kullanabilirsin ama HTML tag istenmediği sürece kullanma.
Hiçbir zaman İngilizce yazmıyorsun; sadece Türkçe.`;

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaOptions {
  temperature?: number;
  model?: string;
  stream?: boolean;
}

export interface GenerateResult {
  content: string;
  model: string;
  durationMs: number;
}

async function chat(
  messages: OllamaMessage[],
  opts: OllamaOptions = {}
): Promise<GenerateResult> {
  if (IS_CLOUD && !API_KEY) throw new Error('OLLAMA_API_KEY tanımlı değil');

  const model = opts.model || MODEL;
  const start = Date.now();

  const body = JSON.stringify({
    model,
    messages,
    stream: false,
    options: {
      temperature: opts.temperature ?? 0.7,
    },
  });

  const res = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
      'Content-Type': 'application/json',
    },
    body,
    signal: AbortSignal.timeout(120000),
  });

  const data = await res.json() as any;

  // Abonelik hatası varsa fallback modele dene
  if (!res.ok && data?.error?.includes('subscription') && model !== FALLBACK) {
    logger.warn(`Ollama: ${model} abonelik gerekli, fallback → ${FALLBACK}`);
    return chat(messages, { ...opts, model: FALLBACK });
  }

  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

  return {
    content: (data.message?.content || '').trim(),
    model: data.model || model,
    durationMs: Date.now() - start,
  };
}

// ─── İçerik Üretim Fonksiyonları ─────────────────────────────────────────────

export async function generatePlaceDescription(
  name: string,
  category: string,
  district: string
): Promise<string> {
  const result = await chat([
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Şanlıurfa'nın ${district} ilçesindeki "${name}" adlı ${category} için 2 cümlelik kısa bir işletme açıklaması yaz. Yalnızca açıklama metnini yaz, başlık veya ek bilgi ekleme.`,
    },
  ]);
  return result.content;
}

export async function generateBlogContent(
  title: string,
  keywords: string[],
  wordCount = 600
): Promise<string> {
  const result = await chat(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `"${title}" başlıklı bir blog yazısı yaz.
Anahtar kelimeler: ${keywords.join(', ')}
Uzunluk: yaklaşık ${wordCount} kelime
Format: H2 ve H3 başlıklar kullan, paragraflar halinde yaz. HTML değil, düz metin+markdown.
Sonunda "## Sonuç" bölümü ekle.`,
      },
    ],
    { temperature: 0.75 }
  );
  return result.content;
}

export async function generateBlogContentHTML(
  title: string,
  keywords: string[],
  wordCount = 600
): Promise<string> {
  const result = await chat(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `"${title}" başlıklı bir blog yazısı yaz.
Anahtar kelimeler: ${keywords.join(', ')}
Uzunluk: yaklaşık ${wordCount} kelime
Format: Sadece HTML etiketleri kullan (h2, h3, p, ul, li). Başka etiket kullanma.
Sonunda <h2>Sonuç</h2> bölümü ekle.`,
      },
    ],
    { temperature: 0.75 }
  );
  return result.content;
}

export async function generateBlogContentHTMLWithContext(
  title: string,
  keywords: string[],
  context: string,
  wordCount = 800
): Promise<string> {
  const result = await chat(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `"${title}" başlıklı bir blog yazısı yaz.
Anahtar kelimeler: ${keywords.join(', ')}
Doğrulanmış veri bağlamı:
${context}

Kurallar:
- Yalnızca veri bağlamında verilen mekan adı, adres, telefon, web sitesi, kategori, çalışma saati, puan ve açıklamayı kullan.
- Veri bağlamında olmayan fiyat, saat, tarih, kapasite, menü veya iddia uydurma.
- Yaklaşık ${wordCount} kelime yaz.
- Sadece HTML etiketleri kullan: h2, h3, p, ul, li, strong, em.
- Son bölüm <h2>Sık Sorulan Sorular</h2> olsun ve 3 soru-cevap içersin.
- Yalnızca HTML içeriğini döndür.`,
      },
    ],
    { temperature: 0.55 }
  );
  return result.content;
}

export async function generateCategoryDescription(
  categoryName: string,
  parentCategory?: string
): Promise<string> {
  const context = parentCategory ? ` (${parentCategory} altında)` : '';
  const result = await chat([
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Şanlıurfa'daki "${categoryName}"${context} kategorisi için 2-3 cümlelik açıklama yaz. SEO uyumlu, Şanlıurfa'ya özgü detaylar içersin.`,
    },
  ]);
  return result.content;
}

export async function generateFAQItems(
  topic: string,
  count = 5
): Promise<Array<{ q: string; a: string }>> {
  const result = await chat(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `"${topic}" hakkında ${count} adet SSS (Sık Sorulan Sorular) oluştur.
Her soru ve cevabı şu JSON formatında ver:
[{"q":"Soru metni?","a":"Cevap metni (en az 40 kelime)."},...]
Sadece JSON array döndür, başka açıklama ekleme.`,
      },
    ],
    { temperature: 0.6 }
  );

  try {
    const cleaned = result.content.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    logger.warn('Ollama FAQ parse hatası, ham metin döndürülüyor');
    return [];
  }
}

export async function generateDistrictGuide(
  district: string,
  highlights: string[]
): Promise<string> {
  const result = await chat(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Şanlıurfa'nın ${district} ilçesi için kapsamlı bir gezi rehberi yaz.
Öne çıkan yerler: ${highlights.join(', ')}
Yaklaşık 500 kelime, H2 başlıklar kullan (Nasıl Gidilir, Gezilecek Yerler, Yeme İçme, Pratik Bilgiler).
HTML formatında yaz (h2, p, ul, li etiketleri).`,
      },
    ],
    { temperature: 0.7 }
  );
  return result.content;
}

export async function generateSeoMetaDescription(
  pageTitle: string,
  pageType: string
): Promise<string> {
  const result = await chat([
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `"${pageTitle}" başlıklı ${pageType} sayfası için 150-160 karakter uzunluğunda bir meta description yaz. SEO uyumlu ve tıklamayı artıracak şekilde. Sadece meta description metnini yaz.`,
    },
  ]);
  return result.content.slice(0, 160);
}

// Ana chat fonksiyonunu da export et (admin paneli için)
export { chat as ollamaChat };
