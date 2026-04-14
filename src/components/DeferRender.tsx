import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================
// DeferRender Bileşeni - Ertelenmiş Render
//
// Özellikler:
// - İlk boyamadan sonra alt bileşenleri render eder
// - requestIdleCallback kullanır (varsa)
// - Ana iş parçacığını engellemez
// - Yapılandırılabilir öncelik (yüksek/orta/düşük)
// - Ertelenmiş yükleme durumu gösterimi
// ============================================================

/**
 * Öncelik seviyeleri
 * - high: Kısa gecikme (50ms) - kritik olmayan ama önemli bileşenler
 * - medium: Orta gecikme (200ms) - normal bileşenler
 * - low: Uzun gecikme (500ms) - ağır, görünmeyen bileşenler
 */
export type RenderPriority = 'high' | 'medium' | 'low';

/**
 * Öncelik seviyelerine göre gecikme süreleri (milisaniye)
 */
const PRIORITY_TIMEOUTS: Record<RenderPriority, number> = {
  high: 50,
  medium: 200,
  low: 500,
};

export interface DeferRenderProps {
  /** Öncelik seviyesi (varsayılan: 'medium') */
  priority?: RenderPriority;

  /** Ertelenmiş içerik */
  children: React.ReactNode;

  /** Yükleme sırasında gösterilecek bileşen/metin */
  loading?: React.ReactNode;

  /** CSS sınıfı (container için) */
  className?: string;

  /** CSS stil eklemeleri */
  style?: React.CSSProperties;

  /** Yükleme bileşeni için CSS sınıfı */
  loadingClassName?: string;

  /** Yükleme süresi dolunca fallback olarak göster (timeout ms) */
  timeout?: number;

  /** Görünür olduğunda render et (Intersection Observer) */
  renderWhenVisible?: boolean;

  /** Görünürlük için rootMargin (varsayılan: '100px') */
  rootMargin?: string;

  /** Render tamamlandığında çağrılır */
  onRendered?: () => void;

  /** Manuel tetikleme - false ise render edilmez */
  enabled?: boolean;
}

/**
 * DeferRender - Ağır bileşenlerin render'ını erteleyerek
 * ilk sayfa yükleme performansını optimize eder.
 *
 * requestIdleCallback API'si kullanarak tarayıcı boşta olduğunda
 * alt bileşenleri render eder, böylece ana iş parçacığı tıkanmaz.
 *
 * @example
 * // Ağır bir listeyi düşük öncelikle render et
 * <DeferRender priority="low">
 *   <HeavyCommentList comments={comments} />
 * </DeferRender>
 *
 * @example
 * // Sadece görünür olduğunda render et
 * <DeferRender renderWhenVisible priority="medium">
 *   <ImageGallery images={images} />
 * </DeferRender>
 */
const DeferRender: React.FC<DeferRenderProps> = ({
  priority = 'medium',
  children,
  loading,
  className = '',
  style = {},
  loadingClassName = '',
  timeout,
  renderWhenVisible = false,
  rootMargin = '100px',
  onRendered,
  enabled = true,
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(!renderWhenVisible);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Temizleme fonksiyonu
  const cleanup = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelIdleCallback(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (timeoutIdRef.current !== null) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  }, []);

  // Component unmount olduğunda temizle
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Intersection Observer - görünür olup olmadığını kontrol et
  useEffect(() => {
    if (!renderWhenVisible || typeof window === 'undefined') return;

    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [renderWhenVisible, rootMargin]);

  // requestIdleCallback ile render erteleme
  useEffect(() => {
    // Enabled false ise render etme
    if (!enabled) return;

    // Zaten render edildiyse veya görünür değilse bekle
    if (shouldRender || !isVisible) return;

    const deferTime = PRIORITY_TIMEOUTS[priority];

    // requestIdleCallback destekleniyorsa kullan
    if ('requestIdleCallback' in window) {
      const idleCallbackId = window.requestIdleCallback(
        () => {
          setShouldRender(true);
          onRendered?.();
        },
        { timeout: deferTime }
      );
      rafIdRef.current = idleCallbackId;
    } else {
      // Fallback: setTimeout kullan
      timeoutIdRef.current = setTimeout(() => {
        setShouldRender(true);
        onRendered?.();
      }, deferTime);
    }

    // Timeout süresi dolunca zorla render et
    if (timeout) {
      timeoutIdRef.current = setTimeout(() => {
        setShouldRender(true);
        onRendered?.();
      }, timeout);
    }

    return cleanup;
  }, [
    enabled,
    shouldRender,
    isVisible,
    priority,
    timeout,
    onRendered,
    cleanup,
  ]);

  // Manuel tetikleme için ref fonksiyonu (dışarıdan erişim için)
  // Bu bileşeni kullanan üst bileşenler triggerRender'ı çağırabilir
  useEffect(() => {
    if (containerRef.current) {
      (containerRef.current as HTMLElement & { triggerRender?: () => void }).triggerRender = () => {
        setShouldRender(true);
        onRendered?.();
      };
    }
  }, [onRendered]);

  // Render edilmediyse loading göster
  if (!shouldRender || !enabled) {
    return (
      <div
        ref={containerRef}
        className={`defer-render-placeholder ${loadingClassName} ${className}`}
        style={style}
      >
        {loading || (
          <div className="defer-render-loading" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '40px',
            color: '#9ca3af',
            fontSize: '14px',
          }}>
            <span>Yükleniyor...</span>
          </div>
        )}
      </div>
    );
  }

  // Gerçek içeriği render et
  return (
    <div
      ref={containerRef}
      className={`defer-render ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};

export default DeferRender;

// ============================================================
// Yardımcı Bileşenler
// ============================================================

/**
 * DeferRender için basit spinner bileşeni.
 * Loading prop'u olarak kullanılabilir.
 */
export const LoadingSpinner: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = '#9ca3af',
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80px',
    }}
  >
    <div
      style={{
        width: size,
        height: size,
        border: `3px solid ${color}33`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

/**
 * Birden fazla DeferRender bileşenini sıralı şekilde render eder.
 * Her biri bir öncekinin tamamlanmasını bekler.
 *
 * @example
 * <DeferRenderQueue priorities={['high', 'medium', 'low']}>
 *   <CriticalSection />
 *   <NormalSection />
 *   <HeavySection />
 * </DeferRenderQueue>
 */
export const DeferRenderQueue: React.FC<{
  children: React.ReactElement[];
  priorities?: RenderPriority[];
  gap?: string;
  className?: string;
}> = ({ children, priorities, gap = '16px', className = '' }) => {
  const [renderedCount, setRenderedCount] = useState(0);

  const handleRendered = useCallback(() => {
    setRenderedCount((prev) => prev + 1);
  }, []);

  const items = React.Children.toArray(children) as React.ReactElement[];

  return (
    <div className={`defer-render-queue ${className}`} style={{ display: 'flex', flexDirection: 'column', gap }}>
      {items.map((child, index) => {
        const priority = priorities?.[index] ?? 'medium';
        const isPending = index >= renderedCount;

        if (isPending) {
          return (
            <DeferRender
              key={child.key ?? index}
              priority={priority}
              onRendered={handleRendered}
              loading={<LoadingSpinner />}
            >
              {child}
            </DeferRender>
          );
        }

        return <React.Fragment key={child.key ?? index}>{child}</React.Fragment>;
      })}
    </div>
  );
};
