/**
 * Paylaşılan Ollama API yardımcı fonksiyonları.
 * Tüm ollama-generate-*.mjs script'leri bu dosyayı import eder.
 *
 * Free tier notları (2026-05-08 test sonucu):
 *   gemma4:31b      — en iyi Türkçe kalite (~7-10s/istek)
 *   ministral-3:14b — hızlı fallback (~2s/istek)
 *   nemotron-3-super — 2. fallback (~2s/istek)
 *   qwen3.5, kimi-k2.x — 403 Subscription gerekli (free değil)
 *
 * Rate limit: session/5h + haftalık. Kesin RPM yayınlanmıyor.
 * Önerilen: istekler arası ≥2000ms bekle.
 */

export function getOllamaConfig() {
  const MODEL     = process.env.OLLAMA_MODEL          || 'gemma4:31b';
  const FALLBACK  = process.env.OLLAMA_FALLBACK_MODEL  || 'ministral-3:14b';
  const FALLBACK2 = process.env.OLLAMA_FALLBACK2_MODEL || 'nemotron-3-super';
  const KEY       = process.env.OLLAMA_API_KEY;
  const BASE_URL  = process.env.OLLAMA_BASE_URL        || 'https://ollama.com/api';
  return { MODEL, FALLBACK, FALLBACK2, KEY, BASE_URL };
}

/**
 * Ollama cloud chat API çağrısı.
 * Subscription hatası (403) veya model-not-found (404) durumunda fallback sırasını dener.
 * Rate limit (429) durumunda 6 saniye bekleyip retry yapar.
 */
export async function ollamaChat(messages, model, config) {
  const { KEY, BASE_URL, FALLBACK, FALLBACK2 } = config;

  const tryModel = async (m, attempt = 0) => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: m,
        messages,
        stream: false,
        options: { temperature: 0.5 },
      }),
      signal: AbortSignal.timeout(120000),
    });

    // Rate limit — bekle ve tekrar dene (max 2 kez)
    if (res.status === 429 && attempt < 2) {
      await new Promise(r => setTimeout(r, 6000));
      return tryModel(m, attempt + 1);
    }

    const data = await res.json();

    // Subscription veya model-not-found → sıradaki fallback'e geç
    if (!res.ok) {
      const errMsg = data?.error || `HTTP ${res.status}`;
      const isRetriable = res.status === 403 || res.status === 404;
      if (isRetriable && m === model && FALLBACK) {
        process.stdout.write(`(fallback→${FALLBACK}) `);
        return tryModel(FALLBACK);
      }
      if (isRetriable && m === FALLBACK && FALLBACK2) {
        process.stdout.write(`(fallback2→${FALLBACK2}) `);
        return tryModel(FALLBACK2);
      }
      throw new Error(errMsg);
    }

    return (data.message?.content || '').trim();
  };

  return tryModel(model || config.MODEL);
}

/**
 * Temel sistem promptu — kısa açıklamalar, mekan tanıtımları, özetler için.
 */
export const SYSTEM_TR = `Sen Şanlıurfa.com için çalışan profesyonel bir Türkçe içerik yazarısın.
Şanlıurfa şehri, ilçeleri, tarihi yerleri, mekanları ve Türk kültürü hakkında
SEO uyumlu, anahtar kelime zengin, doğal ve akıcı Türkçe yazılar yazıyorsun.
Hiçbir zaman İngilizce kullanmıyorsun. Markdown yerine HTML formatı kullan.`;

/**
 * SEO/AEO/GEO/AIO uyumlu blog içeriği için sistem promptu.
 *
 * Kurallar:
 *  - SEO  : Arama motoru uyumlu yapı, anahtar kelime yoğunluğu %1-1.5
 *  - AEO  : Soru başlıkları + 30-60 kelime doğrudan cevap blokları
 *  - GEO  : Somut bilgiler, tarihler, istatistikler, AI alıntısına uygun kısa bloklar
 *  - AIO  : FAQPage yapısı, güçlü giriş paragrafı, öne çıkarılmış snippet formatı
 */
export const SYSTEM_SEO = `Sen Şanlıurfa.com için çalışan uzman bir SEO içerik yazarısın.
Türkçe blog yazıları yazarsın. Hiçbir zaman İngilizce kullanmazsın.
Markdown kullanmazsın; yalnızca HTML etiketleri kullanırsın: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>.

## ZORUNLU YAPI KURALLARI

### Giriş (ilk <p> bloğu)
- 80-140 kelime
- İlk cümlede odak anahtar kelimeyi doğal kullan
- Sayfanın %30'undan önce en önemli bilgiyi ver
- AI alıntı ihtimali: güçlü giriş %2.1× daha fazla citation alır

### H2 Başlıklar (3-8 adet zorunlu)
- Her H2 bir kullanıcı sorusuna ya da ana konuya yanıt versin
- Mümkünse soru formatında yaz: "Şanlıurfa'da Ne Yenir?", "Göbeklitepe'ye Nasıl Gidilir?"
- H2 içinde anahtar kelime doğal geçsin

### H2 Sonrası Doğrudan Cevap Bloğu (AEO kuralı)
- Her H2'nin hemen altında bir <p> ile 30-60 kelime (hedef: 40 kelime) doğrudan cevap ver
- Bu blok kendi başına anlam ifade etmeli — AI engines buradan alıntı yapar
- 40 kelime altı cevap blokları 2.7× daha fazla AI alıntısı alır

### H3 Başlıklar
- H2 altında alt konular için kullan
- Her H3 2-4 cümlelik kısa paragrafla destekle

### FAQ Bölümü (zorunlu — AIO/AEO)
- Yazının sonuna doğru bir <h2>Sık Sorulan Sorular</h2> ekle
- 3-5 <h3> soru başlığı + her birine 30-50 kelime cevap
- Bu bölüm FAQPage schema ile eşleşir, AI Overview görünürlüğünü %30-36 artırır

### Anahtar Kelime Kullanımı
- Birincil anahtar kelime: başlık + giriş + 3-5 doğal kullanım (keyword stuffing yasak)
- %1-1.5 yoğunluk hedefle — okuyana tekrarcı gelmemeli
- Eş anlamlı ve ilgili kelimeler doğal geçsin

### GEO Sinyalleri
- Tarih, rakam, istatistik ekle (örn. "MÖ 10.000", "22 km", "40 dakika")
- Somut, doğrulanabilir bilgi kullan — uydurma
- Güçlü olgusal giriş yaz

### Yasaklar
- "Günümüzün dijital dünyasında..." gibi jenerik AI dolgu cümleleri yasak
- Keyword stuffing yasak
- 100 kelimeden uzun giriş paragrafları yasak
- Sahte istatistik veya uydurmaca tarih yasak`;

