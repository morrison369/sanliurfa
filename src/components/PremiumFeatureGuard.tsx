/**
 * Premium Feature Guard Component
 * Display a prompt to upgrade when accessing premium features without permission
 */

import React, { ReactNode } from 'react';

interface PremiumFeatureGuardProps {
  featureName: string;
  featureDescription: string;
  hasAccess: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PremiumFeatureGuard({
  featureName,
  featureDescription,
  hasAccess,
  children,
  fallback,
}: PremiumFeatureGuardProps) {
  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    fallback || (
      <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
        <div className="mb-4">
          <div className="text-4xl mb-2">🔒</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {featureName} Özelliği
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {featureDescription}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 text-left border border-blue-100 dark:border-blue-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-white">
              Bu özelliği kullanmak için:
            </span>
            <br />
            Premium plana yükseltin ve daha fazla avantajı açılış
          </p>
        </div>

        <a
          href="/fiyatlandirma"
          className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Planları Gör →
        </a>
      </div>
    )
  );
}

/**
 * Disabled state component for premium features
 * Used when feature is disabled but visible
 */
interface PremiumBadgeProps {
  children: ReactNode;
  disabled?: boolean;
  tier: 'basic' | 'pro' | 'enterprise';
}

export function PremiumBadge({ children, disabled = false, tier }: PremiumBadgeProps) {
  const tierColors = {
    basic: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    pro: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    enterprise: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  };

  const tierIcons = {
    basic: '⭐',
    pro: '✨',
    enterprise: '👑',
  };

  return (
    <div className={`relative ${disabled ? 'opacity-60' : ''}`}>
      {children}
      <div
        className={`absolute -top-2 -right-2 inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${tierColors[tier]}`}
      >
        <span>{tierIcons[tier]}</span>
        <span className="capitalize">{tier}</span>
      </div>
    </div>
  );
}
