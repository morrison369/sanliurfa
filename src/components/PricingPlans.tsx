/**
 * Pricing Plans Component
 * Display and manage subscription tier selection
 */

import React, { useState, useEffect } from "react";
import { SubscriptionTierCard } from "./SubscriptionTierCard";

interface SubscriptionTier {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  monthlyPrice: number;
  annualPrice?: number;
  tierLevel: number;
  features?: {
    featureName: string;
    featureLimit?: number;
    description?: string;
  }[];
}

interface PricingPlansProps {}

const fallbackTiers: SubscriptionTier[] = [
  {
    id: "free",
    name: "free",
    displayName: "Ücretsiz",
    description: "Şanlıurfa keşfi ve topluluk özellikleriyle başlamak için.",
    monthlyPrice: 0,
    tierLevel: 1,
    features: [
      { featureName: "Mekân keşfi ve arama" },
      { featureName: "Yorum, favori ve koleksiyon" },
      { featureName: "Takip, mesajlaşma ve bildirimler" },
      { featureName: "Sadakat puanı altyapısı" },
      { featureName: "İki faktörlü doğrulamayı isteğe bağlı açma" },
    ],
  },
  {
    id: "premium",
    name: "premium",
    displayName: "Premium",
    description: "Daha görünür profil ve gelişmiş topluluk avantajları için.",
    monthlyPrice: 0,
    tierLevel: 2,
    features: [
      { featureName: "Öne çıkan profil alanları" },
      { featureName: "Gelişmiş koleksiyon araçları" },
      { featureName: "Erken etkinlik erişimi" },
      { featureName: "Sadakat seviyesi avantajları" },
      { featureName: "Premium özellikler ilk aşamada ücretsiz açık" },
    ],
  },
  {
    id: "business",
    name: "business",
    displayName: "İşletme",
    description:
      "Şanlıurfa işletmeleri için mekân, yorum ve pazarlama yönetimi.",
    monthlyPrice: 0,
    tierLevel: 3,
    features: [
      { featureName: "Mekân ekleme ve yönetim" },
      { featureName: "Yorum takip altyapısı" },
      { featureName: "İşletme analitikleri" },
      { featureName: "Öne çıkan listeleme hazırlığı" },
      { featureName: "Kampanya yönetimi hazırlığı" },
    ],
  },
];

function unwrapApiPayload(responseBody: any) {
  return responseBody?.data?.data || responseBody?.data || responseBody;
}

function getApiErrorMessage(responseBody: any, fallback: string) {
  return (
    responseBody?.error?.message ||
    responseBody?.error ||
    responseBody?.message ||
    fallback
  );
}

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
        const tiersResponse = await fetch("/api/subscriptions/tiers");
        if (!tiersResponse.ok) {
          throw new Error("Planlar yüklenemedi");
        }
        const tiersData = unwrapApiPayload(await tiersResponse.json());
        const apiTiers = Array.isArray(tiersData.tiers) ? tiersData.tiers : [];
        setTiers(apiTiers.length > 0 ? apiTiers : fallbackTiers);

        // Fetch current subscription
        const subResponse = await fetch("/api/user/subscription");
        if (subResponse.ok) {
          const subData = unwrapApiPayload(await subResponse.json());
          if (subData.subscription) {
            setCurrentTier(subData.subscription.tier.id);
          }
        }

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Planlar yüklenemedi");
        setTiers(fallbackTiers);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSelectTier = async (tierId: string) => {
    if (tierId === currentTier) {
      return;
    }

    const tier = tiers.find((item) => item.id === tierId);

    if (!tier || Number(tier.monthlyPrice || 0) === 0) {
      window.location.href =
        tierId === "business" ? "/vendor/dashboard" : "/kayit";
      return;
    }

    setSelectedTier(tierId);
    setIsProcessing(true);

    try {
      const response = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tierId,
          billingCycle: "monthly",
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as any;
        throw new Error(
          getApiErrorMessage(errorData, "Checkout oturumu oluşturulamadı"),
        );
      }

      const data = unwrapApiPayload((await response.json()) as any);

      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("Checkout URL alınamadı");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Abonelik güncellenemedi");
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
      <div className="space-y-6">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 max-w-2xl mx-auto">
          <p className="font-semibold text-amber-900 dark:text-amber-200">
            Planlar veritabanından alınamadı; yerel plan özeti gösteriliyor.
          </p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
            {error}
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {fallbackTiers.map((tier) => (
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
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
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
