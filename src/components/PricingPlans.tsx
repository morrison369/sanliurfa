/**
 * Pricing Plans Component
 * Display and manage subscription tier selection
 */

import React, { useState, useEffect } from 'react';
import { SubscriptionTierCard } from './SubscriptionTierCard';

interface SubscriptionTier {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  monthlyPrice: number;
  annualPrice?: number;
  tierLevel: number;
  features?: { featureName: string; featureLimit?: number; description?: string }[];
}

interface PricingPlansProps {}

export default function PricingPlans({}: PricingPlansProps) {
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch tiers and current subscription
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch available tiers
        const tiersResponse = await fetch('/api/subscriptions/tiers');
        if (!tiersResponse.ok) {
          throw new Error('Failed to fetch tiers');
        }
        const tiersData = await tiersResponse.json();
        setTiers(tiersData.tiers || []);

        // Fetch current subscription
        const subResponse = await fetch('/api/user/subscription');
        if (subResponse.ok) {
          const subData = await subResponse.json();
          if (subData.subscription) {
            setCurrentTier(subData.subscription.tier.id);
          }
        }

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load pricing plans');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSelectTier = async (tierId: string) => {
    if (tierId === currentTier) {
      return; // Already on this tier
    }

    setSelectedTier(tierId);
    setIsProcessing(true);

    try {
      // Create Stripe checkout session
      const response = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tierId,
          billingCycle: 'monthly',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as any;
        throw new Error(errorData.error || 'Checkout oturumu oluşturulamadı');
      }

      const data = await response.json() as any;

      if (data.success && data.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('Checkout URL alınamadı');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Abonelik güncellenemedi');
    } finally {
      setIsProcessing(false);
      setSelectedTier(null);
    }
  };

  if (loading) {
    return (
      <div className="grid md:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-2xl mx-auto">
        <p className="text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-4 gap-6 max-w-7xl mx-auto">
      {tiers.map((tier) => (
        <SubscriptionTierCard
          key={tier.id}
          id={tier.id}
          name={tier.name}
          displayName={tier.displayName}
          description={tier.description}
          monthlyPrice={tier.monthlyPrice}
          annualPrice={tier.annualPrice}
          tierLevel={tier.tierLevel}
          features={tier.features}
          currentTier={currentTier || undefined}
          onSelect={handleSelectTier}
          isLoading={isProcessing && selectedTier === tier.id}
        />
      ))}
    </div>
  );
}
