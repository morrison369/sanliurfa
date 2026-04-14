import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ============================================================
// VirtualList Bileşeni - Sanal Kaydırmalı Liste
//
// Özellikler:
// - Sadece görünür öğeleri render eder
// - Ayarlanabilir öğe yüksekliği
// - Akıcı kaydırma
// - Uzun listeler için (mekanlar, yorumlar vb.)
// - Türkçe boş durum mesajı
// ============================================================

export interface VirtualListProps<T> {
  /** Liste verileri */
  items: T[];

  /** Her öğeyi render eden fonksiyon */
  renderItem: (item: T, index: number) => React.ReactNode;

  /** Her öğenin yüksekliği (piksel, varsayılan: 80) */
  itemHeight?: number;

  /** Container yüksekliği (varsayılan: 400) */
  containerHeight?: number;

  /** Görünür alanın üstünde/altında render edilecek tampon öğe sayısı (varsayılan: 5) */
  overscan?: number;

  /** CSS sınıfı */
  className?: string;

  /** CSS stil eklemeleri */
  style?: React.CSSProperties;

  /** Boş durum mesajı (varsayılan: Türkçe) */
  emptyMessage?: string;

  /** Yükleme durumu */
  loading?: boolean;

  /** Yükleme göstergesi bileşeni */
  loadingComponent?: React.ReactNode;

  /** Kaydırma pozisyonu değiştiğinde çağrılır */
  onScroll?: (scrollTop: number) => void;

  /** Öğeler arası boşluk (varsayılan: 0) */
  gap?: number;

  /** Benzersiz anahtar üretici (varsayılan: index) */
  getKey?: (item: T, index: number) => string | number;
}

/**
 * VirtualList - Büyük listeler için performanslı sanal kaydırma bileşeni.
 *
 * Binlerce öğeyi olan listelerde sadece viewport'ta görünen öğeleri
 * render ederek DOM boyutunu küçültür ve performansı artırır.
 *
 * @example
 * <VirtualList
 *   items={places}
 *   renderItem={(place) => <PlaceCard place={place} />}
 *   itemHeight={120}
 *   containerHeight={600}
 *   overscan={3}
 * />
 */
function VirtualList<T>({
  items,
  renderItem,
  itemHeight = 80,
  containerHeight = 400,
  overscan = 5,
  className = '',
  style = {},
  emptyMessage = 'Gösterilecek öğe bulunamadı.',
  loading = false,
  loadingComponent,
  onScroll,
  gap = 0,
  getKey,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Kaydırma olayını işle
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const top = e.currentTarget.scrollTop;
      setScrollTop(top);
      onScroll?.(top);
    },
    [onScroll]
  );

  // Görünür öğe aralığını hesapla
  const { startIndex, endIndex, totalHeight, offsetY } = useMemo(() => {
    const effectiveItemHeight = itemHeight + gap;
    const total = items.length;

    if (total === 0) {
      return { startIndex: 0, endIndex: 0, totalHeight: 0, offsetY: 0 };
    }

    // Kaçıncı öğeden başlanması gerektiğini hesapla
    const start = Math.max(0, Math.floor(scrollTop / effectiveItemHeight) - overscan);
    // Kaçıncı öğede bitmesi gerektiğini hesapla
    const end = Math.min(
      total,
      Math.ceil((scrollTop + containerHeight) / effectiveItemHeight) + overscan
    );

    // Offset: görünmeyen üst öğelerin toplam yüksekliği
    const offset = start * effectiveItemHeight;
    // Toplam yükseklik: tüm öğelerin yüksekliği
    const totalH = total * effectiveItemHeight - gap;

    return {
      startIndex: start,
      endIndex: end,
      totalHeight: totalH,
      offsetY: offset,
    };
  }, [items.length, scrollTop, containerHeight, itemHeight, gap, overscan]);

  // Görünür öğeleri render et
  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex).map((item, idx) => {
      const actualIndex = startIndex + idx;
      const key = getKey ? getKey(item, actualIndex) : actualIndex;

      return (
        <div
          key={key}
          style={{
            height: itemHeight,
            marginBottom: gap,
          }}
        >
          {renderItem(item, actualIndex)}
        </div>
      );
    });
  }, [items, startIndex, endIndex, itemHeight, gap, renderItem, getKey]);

  // Boş durum
  if (items.length === 0 && !loading) {
    return (
      <div
        className={`virtual-list-empty ${className}`}
        style={{
          height: containerHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280',
          fontSize: '16px',
          ...style,
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  // Yükleme durumu
  if (loading) {
    return (
      <div
        className={`virtual-list-loading ${className}`}
        style={{
          height: containerHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
      >
        {loadingComponent || (
          <span style={{ color: '#6b7280', fontSize: '16px' }}>
            Yükleniyor...
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`virtual-list ${className}`}
      style={{
        height: containerHeight,
        overflowY: 'auto',
        overflowX: 'hidden',
        position: 'relative',
        WebkitOverflowScrolling: 'touch', // iOS akıcı kaydırma
        ...style,
      }}
      onScroll={handleScroll}
    >
      {/* Toplam yükseklikte bir spacer - kaydırma çubuğu doğru çalışsın diye */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: totalHeight,
          pointerEvents: 'none',
        }}
      />

      {/* Görünür öğeleri doğru pozisyonda render et */}
      <div
        style={{
          position: 'absolute',
          top: offsetY,
          left: 0,
          right: 0,
        }}
      >
        {visibleItems}
      </div>
    </div>
  );
}

export default VirtualList;
