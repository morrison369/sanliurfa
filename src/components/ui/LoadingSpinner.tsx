/**
 * LoadingSpinner.tsx - Yükleniyor döner çubuğu bileşeni
 * 
 * Özellikler:
 *   - Boyutlar: sm (20px), md (32px), lg (48px)
 *   - Renkler: primary, secondary, white
 *   - Metin gösterme seçeneği
 *   - Tam ekran kaplama seçeneği
 */

import React from 'react';

/* ------------------------------------------------------------------ */
/*  Boyut ve renk yapılandırması                                      */
/* ------------------------------------------------------------------ */

type SpinnerSize = 'sm' | 'md' | 'lg';
type SpinnerColor = 'primary' | 'secondary' | 'white';

interface SpinnerConfig {
  size: number;
  borderWidth: number;
}

const sizeConfig: Record<SpinnerSize, SpinnerConfig> = {
  sm: { size: 20, borderWidth: 2 },
  md: { size: 32, borderWidth: 3 },
  lg: { size: 48, borderWidth: 4 },
};

const colorMap: Record<SpinnerColor, string> = {
  primary: 'border-primary-600 dark:border-primary-500',
  secondary: 'border-gray-400 dark:border-gray-500',
  white: 'border-white',
};

const textColorMap: Record<SpinnerColor, string> = {
  primary: 'text-primary-600 dark:text-primary-500',
  secondary: 'text-gray-500 dark:text-gray-400',
  white: 'text-white',
};

/* ------------------------------------------------------------------ */
/*  LoadingSpinner Bileşeni                                           */
/* ------------------------------------------------------------------ */

interface LoadingSpinnerProps {
  /** Boyut: sm, md, lg */
  size?: SpinnerSize;
  /** Renk: primary, secondary, white */
  color?: SpinnerColor;
  /** Gösterilecek metin (opsiyonel) */
  text?: string;
  /** Tam ekran kaplama modu */
  fullScreen?: boolean;
  /** Tam ekran arka plan opaklığı (0-1) */
  overlayOpacity?: number;
  /** Ek CSS sınıfı */
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  text,
  fullScreen = false,
  overlayOpacity = 0.7,
  className = '',
}) => {
  const { size: spinnerSize, borderWidth } = sizeConfig[size];
  const borderColor = colorMap[color];
  const textColor = textColorMap[color];

  /* Tam ekran kaplama içeriği */
  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{ backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})` }}
        role="status"
        aria-label="Yükleniyor"
      >
        <div
          className={`
            inline-block rounded-full border-solid
            border-t-transparent animate-spin
            ${borderColor}
          `}
          style={{
            width: spinnerSize * 1.5,
            height: spinnerSize * 1.5,
            borderWidth,
          }}
        />
        {text && (
          <p className={`mt-4 font-medium ${textColor}`}>{text}</p>
        )}
      </div>
    );
  }

  /* Normal (inline) spinner */
  return (
    <div
      className={`inline-flex items-center gap-3 ${className}`}
      role="status"
      aria-label="Yükleniyor"
    >
      <div
        className={`
          inline-block rounded-full border-solid
          border-t-transparent animate-spin
          ${borderColor}
        `}
        style={{
          width: spinnerSize,
          height: spinnerSize,
          borderWidth,
        }}
      />
      {text && <span className={`text-sm font-medium ${textColor}`}>{text}</span>}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Varsayılan export                                                 */
/* ------------------------------------------------------------------ */

export default LoadingSpinner;
