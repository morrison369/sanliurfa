/**
 * Premium Feature Guard Component
 * Display a prompt to upgrade when accessing premium features without permission
 */

import React from "react";
import type { ReactNode } from "react";

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
      <div className="rounded-lg border-2 border-urfa-200 bg-urfa-50 p-6 text-center dark:border-urfa-800 dark:bg-urfa-900/20">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {featureName} Özelliği
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {featureDescription}
          </p>
        </div>

        <div className="mb-4 rounded-lg border border-urfa-100 bg-white p-4 text-left dark:border-urfa-900 dark:bg-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-white">
              Bu özelliği kullanmak için:
            </span>
            <br />
            Üyelik planlarını inceleyin; ilk aşamada temel özellikler ücretsiz
            açık kalır, gelişmiş işletme araçları hazır olduğunda burada
            yönetilir.
          </p>
        </div>

        <a
          href="/fiyatlandirma"
          className="inline-block rounded-lg bg-urfa-700 px-6 py-2 font-medium text-white transition-colors hover:bg-urfa-800"
        >
          Planları gör
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
  tier: "basic" | "pro" | "enterprise";
}

export function PremiumBadge({
  children,
  disabled = false,
  tier,
}: PremiumBadgeProps) {
  const tierColors = {
    basic: "bg-urfa-100 dark:bg-urfa-900/30 text-urfa-700 dark:text-urfa-300",
    pro: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    enterprise:
      "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  };

  const tierLabels = {
    basic: "Temel",
    pro: "Pro",
    enterprise: "Kurumsal",
  };

  return (
    <div className={`relative ${disabled ? "opacity-60" : ""}`}>
      {children}
      <div
        className={`absolute -top-2 -right-2 inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${tierColors[tier]}`}
      >
        <span>{tierLabels[tier]}</span>
      </div>
    </div>
  );
}
