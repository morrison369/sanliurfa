/**
 * Pricing Plans Component
 * Display and manage subscription tier selection
 */
import {  useState, useEffect  } from 'react';
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
  const [phase1FreeMode, setPhase1FreeMode] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Planları ve mevcut aboneliği yükle.
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const tiersResponse = await fetch('/api/subscriptions/tiers');
        if (!tiersResponse.ok) {
          throw new Error('Plan bilgileri yüklenemedi.');
        }
        const tiersData = await tiersResponse.json();
        setTiers(tiersData.tiers || []);
        setPhase1FreeMode(Boolean(tiersData.phase1FreeMode));

        const subResponse = await fetch('/api/user/subscription');
        if (subResponse.ok) {
          const subData = await subResponse.json();
          if (subData.subscription) {
            setCurrentTier(subData.subscription.tier.id);
          }
        }

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Plan bilgileri yüklenemedi.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSelectTier = async (_tierId: string) => {
    if (phase1FreeMode) {
      setSelectedTier(null);
      setIsProcessing(false);
      setInfoMessage('Faz 1 döneminde tüm özellikler ücretsiz ve herkese açık.');
      return;
    }

    setSelectedTier(null);
    setIsProcessing(false);
    setInfoMessage('Abonelik seçimi şu anda devre dışı.');
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
    <div className="space-y-4">
      {phase1FreeMode && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-900">
          Faz 1 açık erişim aktif: tüm plan özellikleri şu anda ücretsiz sunuluyor.
        </div>
      )}
      {infoMessage && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-center justify-between text-blue-900">
          <span>{infoMessage}</span>
          <button onClick={() => setInfoMessage(null)} className="text-blue-400 hover:text-blue-600 ml-4 text-lg leading-none">×</button>
        </div>
      )}
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
    </div>
  );
}
