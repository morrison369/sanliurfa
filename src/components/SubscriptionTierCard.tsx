/**
 * Subscription Tier Card Component
 * Display subscription tier options
 */
interface SubscriptionTierCardProps {
 id: string;
 name: string;
 displayName: string;
 description?: string;
 monthlyPrice: number;
 annualPrice?: number;
 tierLevel: number;
 isActive?: boolean;
 features?: { featureName: string; featureLimit?: number; description?: string }[];
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
 isLoading = false
}: SubscriptionTierCardProps) {
 const isCurrent = currentTier === name;
 const isPopular = tierLevel === 2;

 return (
 <div
 className={`rounded-sm border-2 overflow-hidden transition-all ${
 isPopular
 ? 'border-urfa-500 shadow-lg scale-105'
 : isCurrent
 ? 'border-[rgba(34,197,94,0.6)] shadow-md'
 : 'border-[rgba(184,115,51,0.14)] hover:shadow-md'
 } ${!isLoading && 'cursor-pointer'}`}
 >
 {isPopular && (
 <div className="bg-urfa-600 text-white text-center py-2 text-sm font-bold">
 ⭐ En Popüler
 </div>
 )}

 {isCurrent && (
 <div className="bg-[rgba(34,197,94,0.08)]0 text-white text-center py-2 text-sm font-bold">
 ✓ Mevcut Plan
 </div>
 )}

 <div className="p-6">
 <h3 className="text-2xl font-bold text-[#1F1410]">{displayName}</h3>

 {description && (
 <p className="text-sm text-[#7A6B58] mt-2">{description}</p>
 )}

 <div className="mt-6 mb-6">
 <div className="flex items-baseline gap-1">
 <span className="text-4xl font-bold text-[#1F1410]">₺{monthlyPrice.toFixed(0)}</span>
 <span className="text-[#7A6B58]">/ay</span>
 </div>
 {annualPrice && (
 <p className="text-sm text-[#7A6B58] mt-1">
 veya ₺{annualPrice.toFixed(0)}/yıl ({(annualPrice / 12).toFixed(0)}₺/ay)
 </p>
 )}
 </div>

 {/* Features List */}
 {features.length > 0 && (
 <ul className="space-y-3 mb-6">
 {features.slice(0, 5).map((feature, idx) => (
 <li key={idx} className="flex items-start gap-2">
 <span className="text-green-400 mt-0.5">✓</span>
 <span className="text-sm text-[#7A6B58]">
 {feature.featureName}
 {feature.featureLimit && (
 <span className="text-[#7A6B58]"> ({feature.featureLimit})</span>
 )}
 </span>
 </li>
 ))}
 {features.length > 5 && (
 <li className="text-sm text-[#7A6B58] italic">
 + {features.length - 5} özellik daha
 </li>
 )}
 </ul>
 )}

 <button
 onClick={() => onSelect?.(id)}
 disabled={isLoading || isCurrent}
 className={`w-full py-3 rounded-sm font-medium transition-colors ${
 isCurrent
 ? 'bg-[rgba(184,115,51,0.08)] text-[#7A6B58] cursor-not-allowed'
 : isPopular
 ? 'bg-urfa-600 hover:bg-urfa-700 text-white'
 : 'bg-[rgba(184,115,51,0.08)] hover:bg-[rgba(184,115,51,0.12)] text-[#1F1410]'
 }`}
 >
 {isLoading ? (
 <span className="flex items-center justify-center gap-2">
 <span className="animate-spin">⏳</span>
 İşleniyor...
 </span>
 ) : isCurrent ? (
 'Mevcut Plan'
 ) : (
 'Seç'
 )}
 </button>
 </div>
 </div>
 );
}
