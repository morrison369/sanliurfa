/**
 * Promotions List Component
 * Display promotions in a grid or list format
 */

import React, { useState, useEffect } from 'react';
import { PromotionCard } from './PromotionCard';

interface Promotion {
  id: string;
  title: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  coupon_code?: string;
  start_date: string;
  end_date: string;
  minimum_purchase?: number;
  current_uses?: number;
  max_uses?: number;
  place_id?: string;
}

interface PromotionsListProps {
  placeId?: string;
  trending?: boolean;
  limit?: number;
}

export function PromotionsList({ placeId, trending = false, limit = 12 }: PromotionsListProps) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        setLoading(true);

        let url: string;
        if (placeId) {
          url = `/api/places/${placeId}/promotions`;
        } else if (trending) {
          url = `/api/promotions/search?trending=true&limit=${limit}`;
        } else {
          url = `/api/promotions/search?trending=true&limit=${limit}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Failed to fetch promotions');
        }

        const data = await response.json();
        setPromotions(data.promotions || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setPromotions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPromotions();
  }, [placeId, trending, limit]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-56 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Promosyonlar yüklenemedi: {error}</p>
      </div>
    );
  }

  if (promotions.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-600">Aktif promosyon bulunmamaktadır</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {promotions.map(promotion => (
          <PromotionCard
            key={promotion.id}
            id={promotion.id}
            title={promotion.title}
            description={promotion.description}
            discountType={promotion.discount_type}
            discountValue={promotion.discount_value}
            couponCode={promotion.coupon_code}
            startDate={promotion.start_date}
            endDate={promotion.end_date}
            minPurchase={promotion.minimum_purchase}
            currentUses={promotion.current_uses}
            maxUses={promotion.max_uses}
          />
        ))}
      </div>

      <div className="mt-6 text-center text-sm text-gray-600">
        {promotions.length} promosyon gösteriliyor
      </div>
    </div>
  );
}
