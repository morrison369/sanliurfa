/**
 * Pricing Plans Component
 * Display and manage subscription tier selection
 */
import { useState, useEffect } from 'react';
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
 className="h-96 bg-[rgba(184,115,51,0.08)] rounded-sm animate-pulse"
 />
 ))}
 </div>
 );
 }

 if (error) {
 return (
 <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] rounded-sm p-6 max-w-2xl mx-auto">
 <p className="text-red-700 ">{error}</p>
 </div>
 );
 }

 return (
 <div className="space-y-4">
 {phase1FreeMode && (
 <div className="rounded-sm border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.08)] p-4 text-green-400">
 Faz 1 açık erişim aktif: tüm plan özellikleri şu anda ücretsiz sunuluyor.
 </div>
 )}
 {infoMessage && (
 <div className="rounded-sm border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.1)] p-4 flex items-center justify-between text-blue-300">
 <span>{infoMessage}</span>
 <button onClick={() => setInfoMessage(null)} className="text-blue-400 hover:text-[#7A6B58] ml-4 text-lg leading-none">×</button>
 </div>
 )}
 <div className="grid md:grid-cols-4 gap-6 max-w-7xl mx-auto">
 {tiers.map((tier) => (
 <SubscriptionTierCard
 key={tier.id}
 id={tier.id}
 name={tier.name}
 displayName={tier.displayName}
 monthlyPrice={tier.monthlyPrice}
 tierLevel={tier.tierLevel}
 onSelect={handleSelectTier}
 isLoading={isProcessing && selectedTier === tier.id}
 {...(tier.description ? { description: tier.description } : {})}
 {...(tier.annualPrice !== undefined ? { annualPrice: tier.annualPrice } : {})}
 {...(tier.features ? { features: tier.features } : {})}
 {...(currentTier ? { currentTier } : {})}
 />
 ))}
 </div>
 </div>
 );
}
