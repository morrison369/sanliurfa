/**
 * Promotion Card Component
 * Display promotion/coupon information in card format
 */

import React from 'react';

interface PromotionCardProps {
  id: string;
  title: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  couponCode?: string;
  startDate: string;
  endDate: string;
  minPurchase?: number;
  currentUses?: number;
  maxUses?: number;
  placeName?: string;
}

export function PromotionCard({
  id,
  title,
  description,
  discountType,
  discountValue,
  couponCode,
  endDate,
  minPurchase,
  currentUses = 0,
  maxUses,
  placeName
}: PromotionCardProps) {
  const isExpired = new Date(endDate) < new Date();
  const usagePercentage = maxUses ? Math.round((currentUses / maxUses) * 100) : 0;

  const discountDisplay = discountType === 'percentage'
    ? `%${discountValue.toFixed(0)} İndirim`
    : `₺${discountValue.toFixed(2)} İndirim`;

  return (
    <div className={`rounded-lg border-2 overflow-hidden transition-all ${
      isExpired
        ? 'bg-gray-50 border-gray-200 opacity-60'
        : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 hover:shadow-lg'
    }`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-900">{discountDisplay}</h3>
            <p className="text-sm text-gray-600 mt-1">{title}</p>
          </div>
          {isExpired && (
            <span className="text-xs font-medium bg-gray-300 text-gray-700 px-2 py-1 rounded">
              Süresi Doldu
            </span>
          )}
        </div>

        {description && (
          <p className="text-sm text-gray-700 mb-3 line-clamp-2">{description}</p>
        )}

        {couponCode && (
          <div className="bg-white border-2 border-dashed border-green-400 rounded px-3 py-2 mb-3 font-mono text-center">
            <code className="text-sm font-bold text-green-700">{couponCode}</code>
          </div>
        )}

        <div className="space-y-2 text-xs text-gray-600 mb-3">
          {minPurchase && (
            <div>Min. Alış: <span className="font-medium">₺{minPurchase.toFixed(2)}</span></div>
          )}

          {maxUses && (
            <div>
              <div className="flex justify-between mb-1">
                <span>Kullanılan: {currentUses}/{maxUses}</span>
              </div>
              <div className="w-full bg-gray-300 rounded-full h-1.5">
                <div
                  className="h-1.5 bg-green-500 rounded-full transition-all"
                  style={{ width: `${usagePercentage}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-green-200">
          {placeName && (
            <span className="text-xs text-gray-600">{placeName}</span>
          )}
          <span className="text-xs font-medium text-green-700">
            Sona {Math.ceil(
              (new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            )} gün
          </span>
        </div>
      </div>
    </div>
  );
}
