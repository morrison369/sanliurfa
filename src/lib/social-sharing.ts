/**
 * Sosyal Ağlara Paylaşım
 * Twitter, Facebook, WhatsApp, LinkedIn, Pinterest
 */

export interface SharePayload {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
}

/**
 * Twitter'a paylaş
 */
export function shareOnTwitter(payload: SharePayload): string {
  const text = `${payload.title}\n\n${payload.description}\n\n${payload.url}`;
  const encodedText = encodeURIComponent(text);
  return `https://twitter.com/intent/tweet?text=${encodedText}`;
}

/**
 * Facebook'a paylaş
 */
export function shareOnFacebook(payload: SharePayload): string {
  const params = new URLSearchParams({
    quote: payload.title,
    href: payload.url
  });
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}

/**
 * WhatsApp'a paylaş
 */
export function shareOnWhatsApp(payload: SharePayload): string {
  const text = `${payload.title}\n\n${payload.description}\n\n${payload.url}`;
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/?text=${encodedText}`;
}

/**
 * LinkedIn'e paylaş
 */
export function shareOnLinkedIn(payload: SharePayload): string {
  const params = new URLSearchParams({
    url: payload.url,
    title: payload.title,
    summary: payload.description
  });
  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
}

/**
 * Pinterest'e paylaş
 */
export function shareOnPinterest(payload: SharePayload): string {
  const params = new URLSearchParams({
    url: payload.url,
    description: `${payload.title} - ${payload.description}`,
    media: payload.imageUrl || ''
  });
  return `https://www.pinterest.com/pin/create/button/?${params.toString()}`;
}

/**
 * Email ile gönder
 */
export function shareViaEmail(payload: SharePayload): string {
  const subject = encodeURIComponent(payload.title);
  const body = encodeURIComponent(`${payload.description}\n\n${payload.url}`);
  return `mailto:?subject=${subject}&body=${body}`;
}

/**
 * Tüm paylaşım linklerini oluştur
 */
export function generateShareLinks(payload: SharePayload): Record<string, string> {
  return {
    twitter: shareOnTwitter(payload),
    facebook: shareOnFacebook(payload),
    whatsapp: shareOnWhatsApp(payload),
    linkedin: shareOnLinkedIn(payload),
    pinterest: shareOnPinterest(payload),
    email: shareViaEmail(payload)
  };
}

/**
 * Native Share API (mobilde çalışır)
 */
export async function nativeShare(payload: SharePayload): Promise<boolean> {
  if (!navigator.share) {
    return false;
  }

  try {
    await navigator.share({
      title: payload.title,
      text: payload.description,
      url: payload.url
    });
    return true;
  } catch (err) {
    // Kullanıcı iptal ettiyse hata atılır, bu normal
    return false;
  }
}

/**
 * Paylaşım sayacı kaydet (analytics)
 */
export async function trackShare(postId: number, platform: string): Promise<void> {
  try {
    await fetch('/api/blog/analytics/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, platform })
    });
  } catch (err) {
    console.error('Paylaşım takibi başarısız:', err);
  }
}
