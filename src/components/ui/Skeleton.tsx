/**
 * Skeleton.tsx - Yükleme sırasında yer tutucu iskelet bileşenleri
 * 
 * Kullanım:
 *   <SkeletonCard />       - Mekan kartları için
 *   <SkeletonText lines={3} /> - Metin satırları için
 *   <SkeletonImage />      - Görsel yer tutucuları için
 *   <SkeletonAvatar />     - Kullanıcı avatarları için
 */

import React from 'react';

/* ------------------------------------------------------------------ */
/*  Temel pulse animasyonu için CSS (inline style olarak uygulanır)   */
/* ------------------------------------------------------------------ */
const pulseKeyframes = `
  @keyframes skeleton-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const baseSkeletonStyle: React.CSSProperties = {
  background:
    'linear-gradient(90deg, var(--tw-bg-opacity, 1) 25%, rgba(200,200,200,0.4) 50%, var(--tw-bg-opacity, 1) 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-pulse 1.5s ease-in-out infinite',
  borderRadius: '0.375rem',
};

/* ------------------------------------------------------------------ */
/*  SkeletonCard - Mekan kartı iskeleti                               */
/* ------------------------------------------------------------------ */
interface SkeletonCardProps {
  /** Kart yüksekliği (px) */
  height?: number;
  /** Ek CSS sınıfı */
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  height = 280,
  className = '',
}) => {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${className}`}
      style={{ height }}
      role="status"
      aria-label="Yükleniyor..."
    >
      {/* Görsel alanı */}
      <div
        className="bg-gray-200 dark:bg-gray-700"
        style={{ height: '60%' }}
      />
      {/* İçerik alanı */}
      <div className="p-4 space-y-3">
        <SkeletonText width="75%" height={20} />
        <SkeletonText width="50%" height={16} />
        <div className="flex items-center gap-2 pt-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
          <SkeletonText width="40%" height={14} />
        </div>
      </div>
      <style>{pulseKeyframes}</style>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  SkeletonText - Metin satırı iskeleti                              */
/* ------------------------------------------------------------------ */
interface SkeletonTextProps {
  /** Satır genişliği (yüzde veya piksel: "100%", "200px") */
  width?: string;
  /** Satır yüksekliği (px) */
  height?: number;
  /** Tekrar sayısı (kaç satır) */
  lines?: number;
  /** Ek CSS sınıfı */
  className?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  width = '100%',
  height = 16,
  lines = 1,
  className = '',
}) => {
  return (
    <div className={`space-y-2 ${className}`} role="status" aria-label="Yükleniyor...">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="bg-gray-200 dark:bg-gray-700 rounded"
          style={{
            ...baseSkeletonStyle,
            width: lines > 1 && i === lines - 1 ? `${parseInt(width) * 0.6}%` : width,
            height,
          }}
        />
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  SkeletonImage - Görsel yer tutucu                                 */
/* ------------------------------------------------------------------ */
interface SkeletonImageProps {
  /** Görsel genişliği */
  width?: string;
  /** Görsel yüksekliği */
  height?: string;
  /** Kenar yuvarlaklığı */
  rounded?: boolean;
  /** Ek CSS sınıfı */
  className?: string;
}

export const SkeletonImage: React.FC<SkeletonImageProps> = ({
  width = '100%',
  height = '200px',
  rounded = false,
  className = '',
}) => {
  return (
    <div
      className={`bg-gray-200 dark:bg-gray-700 ${rounded ? 'rounded-xl' : 'rounded'} ${className}`}
      style={{
        ...baseSkeletonStyle,
        width,
        height,
        borderRadius: rounded ? '0.75rem' : '0',
      }}
      role="status"
      aria-label="Görsel yükleniyor..."
    />
  );
};

/* ------------------------------------------------------------------ */
/*  SkeletonAvatar - Kullanıcı avatarı iskeleti                       */
/* ------------------------------------------------------------------ */
interface SkeletonAvatarProps {
  /** Avatar boyutu (px) */
  size?: number;
  /** Yuvarlak veya kare */
  variant?: 'circle' | 'square';
  /** Ek CSS sınıfı */
  className?: string;
}

export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({
  size = 40,
  variant = 'circle',
  className = '',
}) => {
  return (
    <div
      className={`bg-gray-200 dark:bg-gray-700 ${className}`}
      style={{
        ...baseSkeletonStyle,
        width: size,
        height: size,
        borderRadius: variant === 'circle' ? '50%' : '0.375rem',
        flexShrink: 0,
      }}
      role="status"
      aria-label="Avatar yükleniyor..."
    />
  );
};

/* ------------------------------------------------------------------ */
/*  Varsayılan export - Tüm iskelet bileşenleri                       */
/* ------------------------------------------------------------------ */
export default {
  SkeletonCard,
  SkeletonText,
  SkeletonImage,
  SkeletonAvatar,
};
