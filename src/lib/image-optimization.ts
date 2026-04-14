/**
 * Görüntü Optimizasyon Yardımcıları
 *
 * Tembel yükleme, kademeli yükleme, blur-up tekniği,
 * WebP algılama ve responsive srcSet oluşturucu içerir.
 */

// ============================================================
// WebP/AVIF Desteği Algılama
// ============================================================

let webpSupported: boolean | null = null;
let avifSupported: boolean | null = null;

/**
 * Tarayıcının WebP desteğini kontrol eder.
 * Sonucu önbelleğe alır, tekrar tekrar canvas oluşturmaz.
 */
export function isWebPSupported(): Promise<boolean> {
  if (webpSupported !== null) {
    return Promise.resolve(webpSupported);
  }

  if (typeof window === 'undefined') {
    webpSupported = false;
    return Promise.resolve(false);
  }

  return new Promise<boolean>((resolve) => {
    const webp = new Image();
    webp.onload = () => {
      webpSupported = webp.width > 0 && webp.height > 0;
      resolve(webpSupported);
    };
    webp.onerror = () => {
      webpSupported = false;
      resolve(false);
    };
    webp.src =
      'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AA/vuUxE';
  });
}

/**
 * Tarayıcının AVIF desteğini kontrol eder.
 */
export function isAVIFSupported(): Promise<boolean> {
  if (avifSupported !== null) {
    return Promise.resolve(avifSupported);
  }

  if (typeof window === 'undefined') {
    avifSupported = false;
    return Promise.resolve(false);
  }

  return new Promise<boolean>((resolve) => {
    const avif = new Image();
    avif.onload = () => {
      avifSupported = avif.width > 0 && avif.height > 0;
      resolve(avifSupported);
    };
    avif.onerror = () => {
      avifSupported = false;
      resolve(false);
    };
    avif.src =
      'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQF4gQF4gSAAABc9f/pLbYAAAAG3B0eXAAAAAAAoACAAMACAAEABQAGAAcACgALAAw=';
  });
}

// ============================================================
// Responsive srcSet Oluşturucu
// ============================================================

/**
 * Genişlik genişlikleri için srcSet oluşturur.
 *
 * @param baseUrl - Görüntünün temel URL'si (ör: /images/halit-urfa.jpg)
 * @param widths - Oluşturulacak genişlik dizisi (varsayılan: [320, 640, 768, 1024, 1280, 1920])
 * @param format - Görüntü formatı ('jpg', 'webp', 'avif') (varsayılan: 'jpg')
 * @returns srcSet string
 *
 * @example
 * generateSrcSet('/images/halit-urfa', [400, 800], 'webp')
 * // '/images/halit-urfa-400.webp 400w, /images/halit-urfa-800.webp 800w'
 */
export function generateSrcSet(
  baseUrl: string,
  widths: number[] = [320, 640, 768, 1024, 1280, 1920],
  format: 'jpg' | 'webp' | 'avif' = 'jpg'
): string {
  return widths
    .map((w) => {
      const url = baseUrl.includes('.')
        ? baseUrl.replace(/(\.[a-z]+)$/, `-${w}$1`)
        : `${baseUrl}-${w}.${format}`;
      return `${url} ${w}w`;
    })
    .join(', ');
}

/**
 * sizes özniteliği oluşturur.
 * Farklı viewport'lar için ideal genişlik tanımları döner.
 */
export function generateSizes(
  breakpoints: { maxWidth: number; size: string }[] = [
    { maxWidth: 640, size: '100vw' },
    { maxWidth: 1024, size: '50vw' },
    { maxWidth: 1280, size: '33vw' },
    { size: '25vw' },
  ]
): string {
  return breakpoints
    .filter((bp) => bp.size)
    .map((bp) => {
      if (bp.maxWidth) {
        return `(max-width: ${bp.maxWidth}px) ${bp.size}`;
      }
      return bp.size;
    })
    .join(', ');
}

// ============================================================
// Blur-up Tekniği
// ============================================================

/**
 * Görüntü URL'sinden küçük boyutlu blur placeholder URL'si oluşturur.
 * Genellikle 10-20px boyutunda minyatür URL'si üretir.
 *
 * @param originalUrl - Orijinal görüntü URL'si
 * @param blurWidth - Placeholder genişliği (varsayılan: 16)
 * @returns Küçük boyutlu placeholder URL
 */
export function getBlurPlaceholderUrl(originalUrl: string, blurWidth: number = 16): string {
  if (typeof window === 'undefined') return originalUrl;

  // URL parametreleri ile küçük versiyon oluştur
  // Cloudinary/Imgix tarzı servisler için ?w=16&q=10 parametresi
  const separator = originalUrl.includes('?') ? '&' : '?';
  return `${originalUrl}${separator}w=${blurWidth}&q=10&blur=100`;
}

/**
 * SVG tabanlı blur placeholder string üretir.
 * Harici istek olmadan anında gösterilebilir.
 *
 * @param width - Görüntü genişliği
 * @param height - Görüntü yüksekliği
 * @param color - Arka plan rengi (varsayılan: gri ton)
 * @returns SVG data URI string
 */
export function generateSVGPlaceholder(
  width: number,
  height: number,
  color: string = '#e5e7eb'
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="${color}"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ============================================================
// Tembel Yükleme (Lazy Loading) - Intersection Observer
// ============================================================

/**
 * Bir HTML elementini (genellikle <img>) tembel yükleme için kaydeder.
 * Element viewport'a girdiğinde true döner, aksi halde false.
 *
 * @param element - İzlenecek DOM elementi
 * @param options - IntersectionObserver seçenekleri
 * @returns Promise<boolean> - Element görünür olduğunda resolve olur
 */
export function observeForLazyLoad(
  element: HTMLElement,
  options: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px 0px',
    threshold: 0.01,
  }
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      resolve(true);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          observer.unobserve(entry.target);
          resolve(true);
        }
      });
    }, options);

    observer.observe(element);
  });
}

/**
 * Birden fazla elementi tembel yükleme için izler.
 * Her element görünür olduğunda callback'i çağırır.
 *
 * @param elements - İzlenecek elementler
 * @param callback - Görünür olduğunda çağrılacak fonksiyon
 * @param options - IntersectionObserver seçenekleri
 * @returns cleanup fonksiyonu (disconnect)
 */
export function observeMultipleForLazyLoad(
  elements: HTMLElement[],
  callback: (element: HTMLElement) => void,
  options: IntersectionObserverInit = {
    root: null,
    rootMargin: '100px 0px',
    threshold: 0,
  }
): () => void {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    // Observer yoksa hemen hepsini yükle
    elements.forEach(callback);
    return () => {};
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        callback(entry.target as HTMLElement);
        observer.unobserve(entry.target);
      }
    });
  }, options);

  elements.forEach((el) => observer.observe(el));

  // Temizleme fonksiyonu döner
  return () => observer.disconnect();
}

// ============================================================
// Kademeli Yükleme (Progressive Loading)
// ============================================================

/**
 * Görüntünün kademeli olarak yüklenmesini yönetir.
 * Önce blur placeholder gösterilir, sonra gerçek görüntü yüklenir,
 * yüklendiğinde fade-in ile gösterilir.
 *
 * @param img - HTMLImageElement
 * @param src - Gerçek görüntü URL'si
 * @param placeholderSrc - Placeholder URL (blur veya SVG)
 * @param onLoad - Yükleme tamamlandığında çağrılır
 * @param onError - Hata durumunda çağrılır
 */
export function progressiveLoad(
  img: HTMLImageElement,
  src: string,
  placeholderSrc?: string,
  onLoad?: () => void,
  onError?: () => void
): void {
  // Önce placeholder göster
  if (placeholderSrc) {
    img.src = placeholderSrc;
  }

  img.style.opacity = '0';
  img.style.transition = 'opacity 0.4s ease-in-out';

  // Gerçek görüntüyü yükle
  const loader = new Image();

  loader.onload = () => {
    img.src = src;
    img.style.opacity = '1';
    onLoad?.();
  };

  loader.onerror = () => {
    // Hata durumunda placeholder kalır
    img.style.opacity = placeholderSrc ? '1' : '0';
    onError?.();
  };

  loader.src = src;
}

// ============================================================
// Görüntü Boyut Hesaplama
// ============================================================

/**
 * Viewport ve container genişliğine göre ideal görüntü boyutu hesaplar.
 *
 * @param containerWidth - Görüntünün bulunduğu container genişliği
 * @param devicePixelRatio - Cihaz piksel oranı (varsayılan: window.devicePixelRatio)
 * @returns İdeal piksel genişliği
 */
export function calculateOptimalWidth(
  containerWidth: number,
  devicePixelRatio?: number
): number {
  const dpr = devicePixelRatio ?? (typeof window !== 'undefined' ? window.devicePixelRatio : 1);
  const standardWidths = [320, 640, 768, 1024, 1280, 1536, 1920, 2560];

  const ideal = Math.round(containerWidth * dpr);

  // En yakın standart genişliği bul
  for (const w of standardWidths) {
    if (w >= ideal) return w;
  }

  return standardWidths[standardWidths.length - 1];
}

// ============================================================
// Görüntü Önceliklendirme
// ============================================================

/**
 * Görüntünün öncelik durumunu belirler.
 * LCP (Largest Contentful Paint) için above-the-fold görüntüler
 * yüksek öncelikli olmalıdır.
 *
 * @param element - Görüntü elementi
 * @returns 'high' | 'low' öncelik
 */
export function getImagePriority(element: HTMLElement): 'high' | 'low' {
  if (typeof window === 'undefined') return 'low';

  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight;

  // İlk ekran yüksekliğindeki görüntüler yüksek öncelikli
  return rect.top < viewportHeight ? 'high' : 'low';
}

/**
 * <img> elementi için loading ve fetching öncelik özniteliklerini döner.
 *
 * @param priority - 'high' veya 'low'
 * @returns { loading, fetchPriority }
 */
export function getLoadingAttributes(priority: 'high' | 'low'): {
  loading: 'eager' | 'lazy';
  fetchPriority: 'high' | 'low';
} {
  if (priority === 'high') {
    return { loading: 'eager', fetchPriority: 'high' };
  }
  return { loading: 'lazy', fetchPriority: 'low' };
}
