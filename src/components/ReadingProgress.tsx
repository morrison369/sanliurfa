/**
 * ReadingProgress.tsx - Blog yazıları için okuma ilerleme çubuğu
 * 
 * Özellikler:
 *   - Blog yazılarında okuma ilerlemesini gösterir
 *   - Sayfanın üst kısmına sabitlenir (sticky)
 *   - Yumuşak animasyon geçişleri
 *   - Yüzde gösterme seçeneği
 */

import React, { useState, useEffect, useCallback } from 'react';

/* ------------------------------------------------------------------ */
/*  ReadingProgress Bileşeni                                          */
/* ------------------------------------------------------------------ */

interface ReadingProgressProps {
  /** İlerleme çubuğu yüksekliği (piksel) */
  height?: number;
  /** Çubuk rengi */
  color?: string;
  /** Arka plan rengi */
  trackColor?: string;
  /** Yüzde göstergesini göster */
  showPercentage?: boolean;
  /** Yüzde göstergesi konumu */
  percentagePosition?: 'left' | 'right' | 'center';
  /** Belirli bir kapsayıcıyı izle (varsayılan: window) */
  containerRef?: React.RefObject<HTMLElement>;
  /** Ek CSS sınıfı */
  className?: string;
}

export const ReadingProgress: React.FC<ReadingProgressProps> = ({
  height = 4,
  color = 'bg-primary-600 dark:bg-primary-500',
  trackColor = 'bg-gray-200 dark:bg-gray-700',
  showPercentage = false,
  percentagePosition = 'right',
  containerRef,
  className = '',
}) => {
  const [progress, setProgress] = useState(0);

  /* Kaydırma olayını dinle */
  const handleScroll = useCallback(() => {
    let scrollTop: number;
    let scrollHeight: number;
    let clientHeight: number;

    if (containerRef?.current) {
      const el = containerRef.current;
      scrollTop = el.scrollTop;
      scrollHeight = el.scrollHeight;
      clientHeight = el.clientHeight;
    } else {
      scrollTop = window.scrollY || document.documentElement.scrollTop;
      scrollHeight = document.documentElement.scrollHeight;
      clientHeight = document.documentElement.clientHeight;
    }

    const totalScrollable = scrollHeight - clientHeight;
    const currentProgress = totalScrollable > 0 ? Math.min((scrollTop / totalScrollable) * 100, 100) : 0;
    
    setProgress(Math.round(currentProgress));
  }, [containerRef]);

  useEffect(() => {
    const target = containerRef?.current || window;
    target.addEventListener('scroll', handleScroll, { passive: true });
    // Sayfa yüklendiğinde mevcut durumu kontrol et
    handleScroll();
    return () => target.removeEventListener('scroll', handleScroll);
  }, [handleScroll, containerRef]);

  /* Yüzde göstergesi pozisyonuna göre stil */
  const percentageStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '12px',
    fontWeight: 600,
    lineHeight: 1,
    pointerEvents: 'none',
    ...(percentagePosition === 'left' && { left: '8px' }),
    ...(percentagePosition === 'right' && { right: '8px' }),
    ...(percentagePosition === 'center' && { left: '50%', transform: 'translate(-50%, -50%)' }),
  };

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 ${className}`}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Okuma ilerlemesi: %${progress}`}
    >
      {/* Arka plan izleme çubuğu */}
      <div className={`w-full ${trackColor}`} style={{ height: showPercentage ? Math.max(height + 12, 20) : height }}>
        {/* İlerleme çubuğu */}
        <div
          className={`h-full ${color} transition-all duration-150 ease-out relative`}
          style={{
            width: `${progress}%`,
            height,
          }}
        >
          {/* Yüzde göstergesi */}
          {showPercentage && (
            <span
              className="text-gray-700 dark:text-gray-300"
              style={percentageStyle}
              aria-hidden="true"
            >
              %{progress}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReadingProgress;
