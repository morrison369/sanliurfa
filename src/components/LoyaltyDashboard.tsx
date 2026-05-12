import { useState, useEffect } from 'react';
import { TrendingUp, Trophy, Gift, Zap, Star } from 'lucide-react';

interface LoyaltyData {
 balance: {
 total_points: number;
 available_points: number;
 current_tier: string;
 lifetime_points: number;
 };
 tiers: Array<{
 tier_name: string;
 tier_level: number;
 min_points: number;
 point_multiplier: number;
 }>;
 achievements: {
 total_unlocked: number;
 total_available: number;
 unlock_percentage: number;
 };
}

interface LoyaltyDashboardProps {
 onNavigateToRewards?: () => void;
}

export default function LoyaltyDashboard({ onNavigateToRewards }: LoyaltyDashboardProps) {
 const [loading, setLoading] = useState(true);
 const [data, setData] = useState<LoyaltyData | null>(null);
 const [activeTab, setActiveTab] = useState<'overview' | 'rewards' | 'achievements'>('overview');

 useEffect(() => {
 fetchLoyaltyData();
 }, []);

 const fetchLoyaltyData = async () => {
 try {
 setLoading(true);
 const response = await fetch('/api/user/loyalty?section=all');
 const json = await response.json();
 if (json.success) {
 setData(json.data);
 }
 } catch (error) {
 console.error('Failed to fetch loyalty data:', error);
 } finally {
 setLoading(false);
 }
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center p-8">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-urfa-500"></div>
 </div>
 );
 }

 if (!data) {
 return (
 <div className="text-center py-8 text-[#7A6B58]">
 Sadakat bilgileri yüklenemedi. Lütfen daha sonra tekrar deneyin.
 </div>
 );
 }

 const currentTier = data.tiers.find((t) => t.tier_name === data.balance.current_tier);
 const nextTier = data.tiers.find((t) => t.tier_level === (currentTier?.tier_level || 0) + 1);
 const pointsToNextTier = nextTier ? nextTier.min_points - data.balance.total_points : 0;

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="bg-gradient-to-r from-urfa-700 to-isot-600 text-white rounded-sm shadow p-8">
 <div className="flex items-start justify-between">
 <div>
 <h1 className="text-3xl font-bold mb-2">Sadakat Programı</h1>
 <p className="text-[#7A6B58]">Harcadığınız her para için puan kazanın ve özel ödüller açın</p>
 </div>
 <Trophy size={48} className="opacity-80" />
 </div>

 <div className="grid grid-cols-3 gap-4 mt-8">
 <div className="bg-[var(--bg-card)]/10 rounded-sm p-4">
 <div className="text-sm text-[#7A6B58] mb-1">Toplam Puan</div>
 <div className="text-3xl font-bold">{data.balance.total_points.toLocaleString()}</div>
 </div>
 <div className="bg-[var(--bg-card)]/10 rounded-sm p-4">
 <div className="text-sm text-[#7A6B58] mb-1">Kullanılabilir Puan</div>
 <div className="text-3xl font-bold">{data.balance.available_points.toLocaleString()}</div>
 </div>
 <div className="bg-[var(--bg-card)]/10 rounded-sm p-4">
 <div className="text-sm text-[#7A6B58] mb-1">Mevcut Seviye</div>
 <div className="text-3xl font-bold capitalize">{data.balance.current_tier}</div>
 </div>
 </div>
 </div>

 {/* Tier Progress */}
 {nextTier && (
 <div className="bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-6">
 <h2 className="text-xl font-semibold mb-4">Sonraki Seviyeye İlerle</h2>
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <span className="font-medium capitalize">{data.balance.current_tier}</span>
 <span className="text-sm text-[#7A6B58]">{pointsToNextTier} puan kaldı</span>
 </div>
 <div className="w-full bg-[rgba(184,115,51,0.08)] rounded-full h-3">
 <div
 className="bg-gradient-to-r from-urfa-500 to-isot-500 h-3 rounded-full transition-all"
 style={{ width: `${Math.min((data.balance.total_points / nextTier.min_points) * 100, 100)}%` }}
 ></div>
 </div>
 <div className="flex items-center justify-between text-sm">
 <span>{data.balance.total_points}</span>
 <span className="font-semibold">{nextTier.min_points}</span>
 </div>
 </div>
 </div>
 )}

 {/* Tabs */}
 <div className="border-b border-[rgba(184,115,51,0.14)]">
 <div className="flex gap-8">
 <button
 onClick={() => setActiveTab('overview')}
 className={`py-3 px-1 border-b-2 font-medium transition-colors ${
 activeTab === 'overview'
 ? 'border-urfa-500 text-[#7A6B58]'
 : 'border-transparent text-[#7A6B58] hover:text-[#1F1410]'
 }`}
 >
 <div className="flex items-center gap-2">
 <TrendingUp size={20} />
 Genel Bakış
 </div>
 </button>
 <button
 onClick={() => setActiveTab('rewards')}
 className={`py-3 px-1 border-b-2 font-medium transition-colors ${
 activeTab === 'rewards'
 ? 'border-urfa-500 text-[#7A6B58]'
 : 'border-transparent text-[#7A6B58] hover:text-[#1F1410]'
 }`}
 >
 <div className="flex items-center gap-2">
 <Gift size={20} />
 Ödüller
 </div>
 </button>
 <button
 onClick={() => setActiveTab('achievements')}
 className={`py-3 px-1 border-b-2 font-medium transition-colors ${
 activeTab === 'achievements'
 ? 'border-urfa-500 text-[#7A6B58]'
 : 'border-transparent text-[#7A6B58] hover:text-[#1F1410]'
 }`}
 >
 <div className="flex items-center gap-2">
 <Star size={20} />
 Başarılar
 </div>
 </button>
 </div>
 </div>

 {/* Content */}
 {activeTab === 'overview' && (
 <div className="space-y-6">
 {/* Tier Benefits */}
 <div className="bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-6">
 <h3 className="text-lg font-semibold mb-4">Seviye Avantajları</h3>
 <div className="grid grid-cols-2 gap-4">
 {data.tiers.map((tier) => (
 <div
 key={tier.tier_name}
 className={`p-4 rounded-sm border-2 transition-all ${
 data.balance.current_tier === tier.tier_name
 ? 'border-urfa-500 bg-[rgba(59,130,246,0.1)] '
 : 'border-[rgba(184,115,51,0.14)]'
 }`}
 >
 <div className="flex items-start justify-between mb-2">
 <div>
 <h4 className="font-semibold capitalize">{tier.tier_name}</h4>
 <p className="text-sm text-[#7A6B58]">
 {tier.min_points.toLocaleString()}+ puan
 </p>
 </div>
 {data.balance.current_tier === tier.tier_name && (
 <span className="text-xs bg-urfa-600 text-white px-2 py-1 rounded">Mevcut</span>
 )}
 </div>
 <div className="text-sm font-medium text-[#7A6B58]">
 {(tier.point_multiplier * 100).toFixed(0)}% bonus
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Quick Stats */}
 <div className="grid grid-cols-2 gap-4">
 <div className="bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-6">
 <div className="flex items-center gap-3 mb-2">
 <Zap size={24} className="text-yellow-500" />
 <div className="text-sm text-[#7A6B58]">Yaşam Süresi Puanları</div>
 </div>
 <div className="text-3xl font-bold">{data.balance.lifetime_points.toLocaleString()}</div>
 </div>
 <div className="bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-6">
 <div className="flex items-center gap-3 mb-2">
 <Star size={24} className="text-[#B87333]" />
 <div className="text-sm text-[#7A6B58]">Başarılar</div>
 </div>
 <div className="text-3xl font-bold">{data.achievements.total_unlocked}</div>
 <div className="text-xs text-[#7A6B58] mt-1">
 {data.achievements.total_available - data.achievements.total_unlocked} kalmadı
 </div>
 </div>
 </div>
 </div>
 )}

 {activeTab === 'rewards' && (
 <div className="bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-6 text-center">
 <Gift size={48} className="mx-auto text-[#4A3828] mb-4" />
 <p className="text-[#7A6B58] mb-4">
 Puanlarınızı harika ödüllere dönüştürün
 </p>
 <button
 onClick={onNavigateToRewards}
 className="px-6 py-2 bg-urfa-600 text-white rounded-sm hover:bg-urfa-700 transition-colors"
 >
 Ödülleri İncele
 </button>
 </div>
 )}

 {activeTab === 'achievements' && (
 <div className="space-y-4">
 <div className="bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-6">
 <div className="text-center mb-6">
 <div className="text-5xl font-bold text-[#7A6B58] mb-2">
 {data.achievements.unlock_percentage}%
 </div>
 <p className="text-[#7A6B58]">
 {data.achievements.total_unlocked} / {data.achievements.total_available} başarıyı açtınız
 </p>
 </div>
 <div className="w-full bg-[rgba(184,115,51,0.08)] rounded-full h-4">
 <div
 className="bg-gradient-to-r from-urfa-500 to-isot-500 h-4 rounded-full transition-all"
 style={{ width: `${data.achievements.unlock_percentage}%` }}
 ></div>
 </div>
 </div>
 <div className="bg-[rgba(184,115,51,0.06)] rounded-sm p-6 border border-[rgba(184,115,51,0.15)] ">
 <h4 className="font-semibold mb-2">💡 İpucu</h4>
 <p className="text-sm text-[#7A6B58]">
 Daha fazla başarıyı açmak için tesisler hakkında incelemeler yazın ve favori ekleyin.
 </p>
 </div>
 </div>
 )}
 </div>
 );
}
