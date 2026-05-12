/**
 * Rewards Catalog Component
 * Display available rewards and enable redemption
 */
import { useEffect, useState } from 'react';

interface Reward {
 id: string;
 reward_name: string;
 description: string;
 category: string;
 points_cost: number;
 image_url?: string;
 stock_quantity?: number;
 max_per_user?: number;
 available_stock: number;
 is_active: boolean;
}

interface PromotionalOffer {
 id: string;
 offer_name: string;
 reward_id?: string;
 points_discount?: number;
 discount_percent?: number;
 valid_from: string;
 valid_until: string;
 remaining_redemptions?: number;
}

export function RewardsCatalog() {
 const [rewards, setRewards] = useState<Reward[]>([]);
 const [promos, setPromos] = useState<PromotionalOffer[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [selectedCategory, setSelectedCategory] = useState<string>('all');
 const [redeeming, setRedeeming] = useState<string | null>(null);
 const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

 useEffect(() => {
 fetchRewards();
 }, [selectedCategory]);

 const fetchRewards = async () => {
 try {
 setLoading(true);
 setError(null);
 const params = new URLSearchParams({ includePromos: 'true' });
 if (selectedCategory !== 'all') {
 params.append('category', selectedCategory);
 }

 const res = await fetch(`/api/loyalty/rewards?${params}`);
 if (!res.ok) throw new Error('Ödül kataloğu yüklenemedi.');

 const data = await res.json();
 setRewards(data.data?.rewards || []);
 setPromos(data.data?.promotionalOffers || []);
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Ödül kataloğu yüklenemedi.');
 } finally {
 setLoading(false);
 }
 };

 const handleRedeem = async (rewardId: string) => {
 try {
 setRedeeming(rewardId);
 const res = await fetch('/api/loyalty/rewards', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ rewardId })
 });

 if (!res.ok) {
 const data = await res.json();
 throw new Error(data.error || 'Ödül kullanımı tamamlanamadı.');
 }

 const data = await res.json();
 setMessage({
 type: 'success',
 text: `Ödül başarıyla kazanıldı! Kod: ${data.data?.redemptionCode}`
 });

 // Stok bilgisini güncellemek için ödülleri yenile.
 setTimeout(fetchRewards, 1000);
 } catch (err) {
 setMessage({
 type: 'error',
 text: err instanceof Error ? err.message : 'Ödül kullanımı tamamlanamadı.'
 });
 } finally {
 setRedeeming(null);
 }
 };

 const categories = Array.from(new Set(rewards.map((r) => r.category))).filter(Boolean);

 if (loading) {
 return (
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {[...Array(6)].map((_, i) => (
 <div key={i} className="bg-[rgba(184,115,51,0.08)] rounded-sm h-64 animate-pulse"></div>
 ))}
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Promosyon teklifleri */}
 {promos.length > 0 && (
 <div className="bg-[rgba(184,115,51,0.06)] border border-[rgba(184,115,51,0.15)] rounded-sm p-4">
 <h3 className="font-semibold text-[#1F1410] mb-3">🎉 Özel Teklifler</h3>
 <div className="space-y-2">
 {promos.map((promo) => (
 <div key={promo.id} className="flex items-center justify-between">
 <div>
 <p className="font-medium text-sm">{promo.offer_name}</p>
 <p className="text-xs text-orange-400">
 Geçerli: {new Date(promo.valid_from).toLocaleDateString('tr-TR')} - {new Date(promo.valid_until).toLocaleDateString('tr-TR')}
 </p>
 </div>
 {promo.points_discount && <span className="text-sm font-bold text-orange-600">-{promo.points_discount} puan</span>}
 {promo.discount_percent && <span className="text-sm font-bold text-orange-600">-%{promo.discount_percent}</span>}
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Durum mesajı */}
 {message && (
 <div
 className={`rounded-sm p-4 ${message.type === 'success' ? 'bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.2)]' : 'bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)]'}`}
 >
 <p className={message.type === 'success' ? 'text-green-400' : 'text-red-400'}>{message.text}</p>
 </div>
 )}

 {/* Kategori filtresi */}
 {categories.length > 0 && (
 <div className="flex flex-wrap gap-2">
 <button
 onClick={() => setSelectedCategory('all')}
 className={`px-4 py-2 rounded-sm font-medium transition ${
 selectedCategory === 'all'
 ? 'bg-urfa-600 text-white'
 : 'bg-[rgba(184,115,51,0.1)] text-[#7A6B58] hover:bg-[rgba(184,115,51,0.18)]'
 }`}
 >
 Tümü
 </button>
 {categories.map((cat) => (
 <button
 key={cat}
 onClick={() => setSelectedCategory(cat)}
 className={`px-4 py-2 rounded-sm font-medium transition capitalize ${
 selectedCategory === cat
 ? 'bg-urfa-600 text-white'
 : 'bg-[rgba(184,115,51,0.1)] text-[#7A6B58] hover:bg-[rgba(184,115,51,0.18)]'
 }`}
 >
 {cat}
 </button>
 ))}
 </div>
 )}

 {/* Ödül listesi */}
 {error ? (
 <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] rounded-sm p-4">
 <p className="text-red-400">{error}</p>
 </div>
 ) : rewards.length === 0 ? (
 <div className="text-center py-12 text-[#7A6B58]">
 <p className="text-lg">Bu kategoride ödül bulunamadı.</p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {rewards.map((reward) => (
 <div key={reward.id} className="bg-[var(--bg-card)] rounded-sm shadow-md overflow-hidden hover:shadow-lg transition">
 {reward.image_url && (
 <img src={reward.image_url} alt={reward.reward_name} className="w-full h-48 object-cover" />
 )}
 <div className="p-4">
 <h3 className="font-semibold text-lg mb-1">{reward.reward_name}</h3>
 <p className="text-sm text-[#7A6B58] mb-3">{reward.description}</p>

 <div className="flex items-center justify-between mb-4">
 <span className="text-2xl font-bold text-[#7A6B58]">{reward.points_cost.toLocaleString()}</span>
 <span className="text-xs px-2 py-1 bg-[rgba(184,115,51,0.06)] rounded">{reward.category}</span>
 </div>

 {reward.available_stock !== null && reward.available_stock <= 0 && (
 <div className="text-red-600 text-sm font-medium mb-2">Tükenmiş</div>
 )}

 {reward.available_stock !== null && reward.available_stock > 0 && (
 <p className="text-xs text-[#7A6B58] mb-3">{reward.available_stock} adet kaldı</p>
 )}

 <button
 onClick={() => handleRedeem(reward.id)}
 disabled={
 redeeming === reward.id || (reward.available_stock !== null && reward.available_stock <= 0)
 }
 className={`w-full py-2 rounded-sm font-medium transition ${
 reward.available_stock !== null && reward.available_stock <= 0
 ? 'bg-[rgba(184,115,51,0.12)] text-[#7A6B58] cursor-not-allowed'
 : redeeming === reward.id
 ? 'bg-urfa-500 text-white cursor-wait'
 : 'bg-urfa-600 text-white hover:bg-urfa-700'
 }`}
 >
 {redeeming === reward.id ? 'İşleniyor...' : 'Puan Kullan'}
 </button>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 );
}
