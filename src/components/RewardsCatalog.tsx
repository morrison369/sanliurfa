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
      if (!res.ok) throw new Error('Failed to fetch rewards');

      const data = await res.json();
      setRewards(data.data?.rewards || []);
      setPromos(data.data?.promotionalOffers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rewards');
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
        throw new Error(data.error || 'Redemption failed');
      }

      const data = await res.json();
      setMessage({
        type: 'success',
        text: `Ödül başarıyla kazanıldı! Kod: ${data.data?.redemptionCode}`
      });

      // Refresh rewards to update available stock
      setTimeout(fetchRewards, 1000);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Redemption failed'
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
          <div key={i} className="bg-gray-200 rounded-lg h-64 animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Promotional Offers */}
      {promos.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-orange-200 rounded-lg p-4">
          <h3 className="font-semibold text-orange-900 mb-3">🎉 Özel Teklifler</h3>
          <div className="space-y-2">
            {promos.map((promo) => (
              <div key={promo.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{promo.offer_name}</p>
                  <p className="text-xs text-orange-700">
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

      {/* Message */}
      {message && (
        <div
          className={`rounded-lg p-4 ${message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
        >
          <p className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>{message.text}</p>
        </div>
      )}

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Tümü
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg font-medium transition capitalize ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Rewards Grid */}
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      ) : rewards.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">Bu kategoride ödül bulunamadı.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map((reward) => (
            <div key={reward.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
              {reward.image_url && (
                <img src={reward.image_url} alt={reward.reward_name} className="w-full h-48 object-cover" />
              )}
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-1">{reward.reward_name}</h3>
                <p className="text-sm text-gray-600 mb-3">{reward.description}</p>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-bold text-blue-600">{reward.points_cost.toLocaleString()}</span>
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded">{reward.category}</span>
                </div>

                {reward.available_stock !== null && reward.available_stock <= 0 && (
                  <div className="text-red-600 text-sm font-medium mb-2">Tükenmiş</div>
                )}

                {reward.available_stock !== null && reward.available_stock > 0 && (
                  <p className="text-xs text-gray-500 mb-3">{reward.available_stock} adet kaldı</p>
                )}

                <button
                  onClick={() => handleRedeem(reward.id)}
                  disabled={
                    redeeming === reward.id || (reward.available_stock !== null && reward.available_stock <= 0)
                  }
                  className={`w-full py-2 rounded-lg font-medium transition ${
                    reward.available_stock !== null && reward.available_stock <= 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : redeeming === reward.id
                        ? 'bg-blue-400 text-white cursor-wait'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
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
