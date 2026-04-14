/**
 * EmptyState.tsx - Boş durum yer tutucu bileşeni
 * 
 * Kullanım alanları:
 *   - Veri bulunamadığında
 *   - Arama sonucu boş döndüğünde
 *   - Hata durumunda
 *   - Çevrimdışı bağlantıda
 * 
 * Varyantlar: no-data, no-results, error, offline
 */

import React from 'react';

/* ------------------------------------------------------------------ */
/*  SVG İkonlar - Her varyant için özel ikon                          */
/* ------------------------------------------------------------------ */

// Veri yok ikonu - Klasör
const IconNoData: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M8 16C8 14.8954 8.89543 14 10 14H22L28 20H54C55.1046 20 56 20.8954 56 22V50C56 51.1046 55.1046 52 54 52H10C8.89543 52 8 51.1046 8 50V16Z"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M32 30V42M26 36H38"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

// Sonuç yok ikonu - Arama
const IconNoResults: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="26" cy="26" r="16" stroke="currentColor" strokeWidth="2.5" />
    <path
      d="M38 38L50 50"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M20 26H32"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

// Hata ikonu - Uyarı üçgeni
const IconError: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M32 8L4 56H60L32 8Z"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M32 24V36"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <circle cx="32" cy="44" r="2" fill="currentColor" />
  </svg>
);

// Çevrimdışı ikonu - Wifi kesik
const IconOffline: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M4 24C10.5 16.5 20.5 12 32 12C43.5 12 53.5 16.5 60 24"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M12 34C16.5 29 23.5 26 32 26C40.5 26 47.5 29 52 34"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M20 44C22.5 41 26.5 39 32 39"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M6 6L58 58"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeDasharray="4 4"
    />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Varyant yapılandırması                                            */
/* ------------------------------------------------------------------ */

type EmptyVariant = 'no-data' | 'no-results' | 'error' | 'offline';

interface VariantConfig {
  icon: React.FC<{ className?: string }>;
  defaultTitle: string;
  defaultDescription: string;
  defaultActionText: string;
  iconColor: string;
}

const variantConfig: Record<EmptyVariant, VariantConfig> = {
  'no-data': {
    icon: IconNoData,
    defaultTitle: 'Henüz içerik yok',
    defaultDescription: 'Bu alanda henüz bir içerik bulunmuyor. İlk içeriği eklemek için butona tıklayın.',
    defaultActionText: 'İçerik Ekle',
    iconColor: 'text-gray-400 dark:text-gray-500',
  },
  'no-results': {
    icon: IconNoResults,
    defaultTitle: 'Sonuç bulunamadı',
    defaultDescription: 'Arama kriterlerinize uygun sonuç bulunamadı. Farklı anahtar kelimeler deneyin.',
    defaultActionText: 'Filtreleri Temizle',
    iconColor: 'text-gray-400 dark:text-gray-500',
  },
  'error': {
    icon: IconError,
    defaultTitle: 'Bir hata oluştu',
    defaultDescription: 'İşlem sırasında beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
    defaultActionText: 'Tekrar Dene',
    iconColor: 'text-red-400 dark:text-red-500',
  },
  'offline': {
    icon: IconOffline,
    defaultTitle: 'Bağlantı kesildi',
    defaultDescription: 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.',
    defaultActionText: 'Yeniden Bağlan',
    iconColor: 'text-amber-400 dark:text-amber-500',
  },
};

/* ------------------------------------------------------------------ */
/*  EmptyState Bileşeni                                               */
/* ------------------------------------------------------------------ */

interface EmptyStateProps {
  /** Varyant tipi */
  variant?: EmptyVariant;
  /** Başlık (varsayılan: varyanta göre) */
  title?: string;
  /** Açıklama (varsayılan: varyanta göre) */
  description?: string;
  /** Buton metni (varsayılan: varyanta göre) */
  actionText?: string;
  /** Buton tıklama işleyicisi */
  onAction?: () => void;
  /** Özel ikon (varsayılan ikon yerine) */
  customIcon?: React.ReactNode;
  /** Ek CSS sınıfı */
  className?: string;
  /** İkon boyutu (piksel) */
  iconSize?: number;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  variant = 'no-data',
  title,
  description,
  actionText,
  onAction,
  customIcon,
  className = '',
  iconSize = 96,
}) => {
  const config = variantConfig[variant];
  const IconComponent = config.icon;

  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}
      role="status"
    >
      {/* İkon */}
      <div className={`mb-6 ${config.iconColor}`}>
        {customIcon ? (
          customIcon
        ) : (
          <IconComponent
            className="w-24 h-24"
            style={{ width: iconSize, height: iconSize }}
          />
        )}
      </div>

      {/* Başlık */}
      <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
        {title || config.defaultTitle}
      </h3>

      {/* Açıklama */}
      <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
        {description || config.defaultDescription}
      </p>

      {/* Aksiyon Butonu */}
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="
            inline-flex items-center gap-2 px-6 py-2.5
            bg-primary-600 hover:bg-primary-700
            dark:bg-primary-500 dark:hover:bg-primary-600
            text-white font-medium rounded-lg
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
            dark:focus:ring-offset-gray-800
          "
        >
          {actionText || config.defaultActionText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
