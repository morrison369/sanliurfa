/**
 * Subscription Tier Card Component
 * Display subscription tier options
 */

import React from "react";

interface SubscriptionTierCardProps {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  monthlyPrice: number;
  annualPrice?: number;
  tierLevel: number;
  isActive?: boolean;
  features?: {
    featureName: string;
    featureLimit?: number;
    description?: string;
  }[];
  currentTier?: string;
  onSelect?: (tierId: string) => void;
  isLoading?: boolean;
}

export function SubscriptionTierCard({
  id,
  name,
  displayName,
  description,
  monthlyPrice,
  annualPrice,
  tierLevel,
  features = [],
  currentTier,
  onSelect,
  isLoading = false,
}: SubscriptionTierCardProps) {
  const isCurrent = currentTier === id || currentTier === name;
  const isPopular = tierLevel === 2;

  return (
    <div
      className={`rounded-lg border-2 overflow-hidden transition-all ${
        isPopular
          ? "border-urfa-600 shadow-lg scale-105"
          : isCurrent
            ? "border-isot-600 shadow-md"
            : "border-gray-200 hover:shadow-md"
      } ${!isLoading && "cursor-pointer"}`}
    >
      {isPopular && (
        <div className="bg-urfa-700 text-white text-center py-2 text-sm font-bold">
          En çok tercih edilen
        </div>
      )}

      {isCurrent && (
        <div className="bg-isot-700 text-white text-center py-2 text-sm font-bold">
          Mevcut plan
        </div>
      )}

      <div className="p-6">
        <h3 className="text-2xl font-bold text-gray-900">{displayName}</h3>

        {description && (
          <p className="text-sm text-gray-600 mt-2">{description}</p>
        )}

        <div className="mt-6 mb-6">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-gray-900">
              ₺{monthlyPrice.toFixed(0)}
            </span>
            <span className="text-gray-600">/ay</span>
          </div>
          {annualPrice && (
            <p className="text-sm text-gray-600 mt-1">
              veya ₺{annualPrice.toFixed(0)}/yıl (
              {(annualPrice / 12).toFixed(0)}₺/ay)
            </p>
          )}
        </div>

        {/* Features List */}
        {features.length > 0 && (
          <ul className="space-y-3 mb-6">
            {features.slice(0, 5).map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span className="text-sm text-gray-700">
                  {feature.featureName}
                  {feature.featureLimit && (
                    <span className="text-gray-500">
                      {" "}
                      ({feature.featureLimit})
                    </span>
                  )}
                </span>
              </li>
            ))}
            {features.length > 5 && (
              <li className="text-sm text-gray-600 italic">
                + {features.length - 5} özellik daha
              </li>
            )}
          </ul>
        )}

        <button
          onClick={() => onSelect?.(id)}
          disabled={isLoading || isCurrent}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            isCurrent
              ? "bg-gray-200 text-gray-700 cursor-not-allowed"
              : isPopular
                ? "bg-urfa-700 hover:bg-urfa-800 text-white"
                : "bg-gray-200 hover:bg-gray-300 text-gray-900"
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              İşleniyor...
            </span>
          ) : isCurrent ? (
            "Mevcut plan"
          ) : (
            "Seç"
          )}
        </button>
      </div>
    </div>
  );
}
