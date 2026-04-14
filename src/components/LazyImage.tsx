import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  progressiveLoad,
  getBlurPlaceholderUrl,
  generateSVGPlaceholder,
  observeForLazyLoad,
  isWebPSupported,
  isAVIFSupported,
} from '../lib/image-optimization';

// ============================================================
// LazyImage Bileşeni - Tembel Yüklenen Görüntü
//
// Özellikler:
// - Intersection Observer tabanlı tembel yükleme
// - Blur placeholder (SVG veya düşük çözünürlüklü)
// - Yüklendiğinde fade-in animasyonu
// - Hata durumunda yedek görüntü
// - WebP/AVIF otomatik algılama
// - Türkçe alt metin desteği
// - Responsive boyutlandırma
// ============================================================

export interface LazyImageProps {
  /** Görüntü URL'si (gerekli) */
  src: string;

  /** Alt metin (Türkçe, erişilebilirlik için gerekli) */
  alt: string;

  /** CSS genişliği (varsayılan: '100%') */
  width?: string | number;

  /** CSS yüksekliği (varsayılan: 'auto') */
  height?: string | number;

  /** Aspect ratio (örn: '16/9', '4/3', '1/1') */
  aspectRatio?: string;

  /** CSS object-fit (varsayılan: 'cover') */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

  /** Placeholder türü (varsayılan: 'blur') */
  placeholder?: 'blur' | 'svg' | 'none';

  /** Placeholder rengi (SVG placeholder için, varsayılan: '#e5e7eb') */
  placeholderColor?: string;

  /** Yükleme hatası durumunda gösterilecek yedek görüntü */
  fallbackSrc?: string;

  /** Container CSS sınıfı */
  className?: string;

  /** Görüntü CSS sınıfı */
  imageClassName?: string;

  /** Container stil eklemeleri */
  style?: React.CSSProperties;

  /** Yüklenince çağrılır */
  onLoad?: () => void;

  /** Hata olursa çağrılır */
  onError?: () => void;

  /** Görünür olmadan önceki kenar boşluğu (daha erken yükleme için) */
  rootMargin?: string;

  /** Öncelik (yüksek öncelikliler hemen yüklenir) */
  priority?: boolean;

  /** Responsive srcSet */
  srcSet?: string;

  /** Responsive sizes özniteliği */
  sizes?: string;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  width = '100%',
  height = 'auto',
  aspectRatio,
  objectFit = 'cover',
  placeholder = 'blur',
  placeholderColor = '#e5e7eb',
  fallbackSrc,
  className = '',
  imageClassName = '',
  style = {},
  onLoad,
  onError,
  rootMargin = '50px 0px',
  priority = false,
  srcSet,
  sizes,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [bestFormat, setBestFormat] = useState<'avif' | 'webp' | 'jpg'>('jpg');

  // En iyi görüntü formatını algıla
  useEffect(() => {
    let cancelled = false;

    async function detectFormat() {
      if (await isAVIFSupported()) {
        if (!cancelled) setBestFormat('avif');
      } else if (await isWebPSupported()) {
        if (!cancelled) setBestFormat('webp');
      } else if (!cancelled) {
        setBestFormat('jpg');
      }
    }

    detectFormat();
    return () => {
      cancelled = true;
    };
  }, []);

  // Placeholder URL'sini oluştur
  const placeholderSrc = placeholder === 'svg'
    ? generateSVGPlaceholder(40, 30, placeholderColor)
    : placeholder === 'blur'
      ? getBlurPlaceholderUrl(src, 16)
      : undefined;

  // İlk render'da placeholder göster
  useEffect(() => {
    if (placeholder !== 'none') {
      setCurrentSrc(placeholderSrc || src);
    } else {
      setCurrentSrc(src);
    }
  }, [placeholder, placeholderSrc, src]);

  // Intersection Observer ile görünür olup olmadığını kontrol et
  useEffect(() => {
    if (priority || typeof window === 'undefined') return;

    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [priority, rootMargin]);

  // Görünür olduğunda gerçek görüntüyü yükle
  const loadRealImage = useCallback(() => {
    if (!imgRef.current || !isInView) return;

    progressiveLoad(
      imgRef.current,
      src,
      placeholder !== 'none' ? placeholderSrc : undefined,
      () => {
        setIsLoaded(true);
        setHasError(false);
        onLoad?.();
      },
      () => {
        setHasError(true);
        onError?.();

        // Yedek görüntü varsa onu dene
        if (fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }
    );
  }, [src, placeholderSrc, placeholder, isInView, fallbackSrc, onLoad, onError]);

  useEffect(() => {
    if (isInView) {
      loadRealImage();
    }
  }, [isInView, loadRealImage]);

  // Aspect ratio padding hesapla
  const paddingBottom = aspectRatio
    ? `${(1 / eval(aspectRatio)) * 100}%`
    : height !== 'auto'
      ? undefined
      : undefined;

  return (
    <div
      ref={containerRef}
      className={`lazy-image-container ${className}`}
      style={{
        width,
        position: aspectRatio || height === 'auto' ? 'relative' : undefined,
        paddingBottom,
        overflow: 'hidden',
        background: placeholder !== 'none' ? placeholderColor : undefined,
        ...style,
      }}
    >
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        className={`lazy-image ${imageClassName} ${isLoaded ? 'loaded' : 'loading'} ${hasError ? 'error' : ''}`}
        style={{
          width: '100%',
          height: aspectRatio || paddingBottom ? '100%' : height,
          position: aspectRatio || paddingBottom ? 'absolute' : undefined,
          top: 0,
          left: 0,
          objectFit,
          transition: 'opacity 0.4s ease-in-out',
          opacity: isLoaded ? 1 : placeholder !== 'none' ? 1 : 0,
        }}
        srcSet={srcSet}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        onError={() => {
          setHasError(true);
          onError?.();
          if (fallbackSrc && currentSrc !== fallbackSrc) {
            setCurrentSrc(fallbackSrc);
          }
        }}
      />

      {/* Yükleniyor göstergesi (opsiyonel) */}
      {!isLoaded && !hasError && placeholder === 'none' && (
        <div className="lazy-image-loading" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: placeholderColor,
        }}>
          <span style={{ color: '#9ca3af', fontSize: '14px' }}>
            Yükleniyor...
          </span>
        </div>
      )}
    </div>
  );
};

export default LazyImage;
