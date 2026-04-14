/**
 * BackToTop.tsx - Gelişmiş yukarı çık butonu
 * 
 * Özellikler:
 *   - Yumuşak kaydırma (smooth scroll)
 *   - Dairesel ilerleme göstergesi (circular progress)
 *   - 300px kaydırmadan sonra görünür
 *   - Türkçe aria-label
 */

import React, { useState, useEffect, useCallback } from 'react';

/* ------------------------------------------------------------------ */
/*  Dairesel ilerleme bileşeni                                        */
/* ------------------------------------------------------------------ */

interface CircularProgressProps {
  /** İlerleme yüzdesi (0-100) */
  progress: number;
  /** Çember çapı (piksel) */
  diameter: number;
  /** Çember kalınlığı (piksel) */
  strokeWidth: number;
  /** Çember rengi */
  color: string;
  /** Arka plan çember rengi */
  trackColor: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  diameter,
  strokeWidth,
  color,
  trackColor,
}) => {
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  const center = diameter / 2;

  return (
    <svg
      width={diameter}
      height={diameter}
      viewBox={`0 0 ${diameter} ${diameter}`}
      className="transform -rotate-90"
      aria-hidden="true"
    >
      {/* Arka plan çemberi */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      {/* İlerleme çemberi */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-150 ease-out"
      />
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/*  BackToTop Bileşeni                                                */
/* ------------------------------------------------------------------ */

interface BackToTopProps {
  /** Görünür olma eşiği (piksel) */
  threshold?: number;
  /** Buton konumu (sağ alt köşe ofseti) */
  offset?: number;
  /** Kaydırma hedefi (varsayılan: sayfa başı) */
  targetRef?: React.RefObject<HTMLElement>;
  /** Ek CSS sınıfı */
  className?: string;
}

export const BackToTop: React.FC<BackToTopProps> = ({
  threshold = 300,
  offset = 24,
  targetRef,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  /* Kaydırma olayını dinle */
  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight =
      document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;

    setIsVisible(scrollTop > threshold);
    setScrollProgress(progress);
  }, [threshold]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Sayfa yüklendiğinde mevcut kaydırma durumunu kontrol et
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  /* Yukarı kaydır */
  const scrollToTop = () => {
    if (targetRef?.current) {
      targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  /* Görünmezse render etme */
  if (!isVisible) return null;

  const diameter = 48;
  const strokeWidth = 4;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className={`
        fixed z-40 flex items-center justify-center
        rounded-full shadow-lg
        bg-white dark:bg-gray-800
        hover:bg-gray-50 dark:hover:bg-gray-700
        transition-all duration-300 transform hover:scale-110
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        dark:focus:ring-offset-gray-900
        ${className}
      `}
      style={{
        right: offset,
        bottom: offset,
      }}
      aria-label="Sayfanın başına dön"
      title="Yukarı çık"
    >
      {/* Dairesel ilerleme arka planı */}
      <div className="absolute inset-0 flex items-center justify-center">
        <CircularProgress
          progress={scrollProgress}
          diameter={diameter + strokeWidth * 2}
          strokeWidth={strokeWidth}
          color="var(--tw-text-opacity, #2563eb)"
          trackColor="rgba(0, 0, 0, 0.1)"
        />
      </div>

      {/* Yukarı ok ikonu */}
      <svg
        className="relative z-10 w-5 h-5 text-gray-700 dark:text-gray-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 15l-6-6-6 6" />
      </svg>
    </button>
  );
};

export default BackToTop;
