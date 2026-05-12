/**
 * Pexels + Unsplash karma image fetcher.
 * searchImage(query) → en iyi sonucu döner; Pexels önce, Unsplash fallback.
 */

export async function searchImage(query, opts = {}) {
  const { pexelsKey, unsplashKey, orientation = 'landscape' } = opts;

  if (pexelsKey) {
    try {
      const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=${orientation}`;
      const res = await fetch(url, { headers: { Authorization: pexelsKey } });
      if (res.ok) {
        const data = await res.json();
        const photo = data.photos?.[0];
        if (photo) return photo.src.large2x || photo.src.large || photo.src.medium;
      }
    } catch {}
  }

  if (unsplashKey) {
    try {
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=${orientation}`;
      const res = await fetch(url, { headers: { Authorization: `Client-ID ${unsplashKey}` } });
      if (res.ok) {
        const data = await res.json();
        const photo = data.results?.[0];
        if (photo) return photo.urls.regular || photo.urls.full;
      }
    } catch {}
  }

  return null;
}

export async function downloadImage(imageUrl) {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Download HTTP ${res.status}: ${imageUrl}`);
  const buf = await res.arrayBuffer();
  return Buffer.from(buf);
}
