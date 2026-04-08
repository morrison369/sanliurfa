import React, { useState, useEffect } from 'react';

interface Reward {
  id: string;
  reward_name: string;
  description: string;
  category: string;
  points_cost: number;
  available_stock: number;
  is_active?: boolean;
}

interface PointsData {
  currentBalance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  pendingPoints: number;
  lastEarned?: string;
}

export default function RewardsPanel() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [userPoints, setUserPoints] = useState<PointsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRewardsAndPoints();
  }, []);

  const loadRewardsAndPoints = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load rewards catalog
      const rewardsResponse = await fetch('/api/loyalty/rewards');
      if (!rewardsResponse.ok) {
        throw new Error('Ödüller yüklenemedi');
      }
      const rewardsData = await rewardsResponse.json();
      setRewards(rewardsData.data || []);

      // Load user points
      const pointsResponse = await fetch('/api/loyalty/points');
      if (pointsResponse.ok) {
        const pointsData = await pointsResponse.json();
        setUserPoints(pointsData.data || { currentBalance: 0, lifetimeEarned: 0, lifetimeSpent: 0, pendingPoints: 0 });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">Yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
        {error}
      </div>
    );
  }

  const currentBalance = userPoints?.currentBalance || 0;

  return (
    <div className="space-y-4">
      {/* Points Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Mevcut Puanlarınız</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {currentBalance.toLocaleString('tr-TR')}
            </p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-xs text-gray-600 dark:text-gray-400">Toplam Kazanılan</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {(userPoints?.lifetimeEarned || 0).toLocaleString('tr-TR')}
            </p>
          </div>
        </div>
      </div>

      {/* Rewards Catalog */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Ödüller Kataloğu</h3>

        {rewards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rewards.map((reward) => {
              const canAfford = currentBalance >= reward.points_cost;
              const inStock = reward.available_stock > 0;
              const canRedeem = canAfford && inStock;

              return (
                <div
                  key={reward.id}
                  className={`rounded-lg border p-4 transition-all ${
                    canRedeem
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 cursor-pointer hover:shadow-md'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 dark:text-white text-base">
                        {reward.reward_name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {reward.category}
                      </p>
                    </div>
                    {!inStock && (
                      <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-medium">
                        Tükendi
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {reward.description}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className={`text-lg font-bold ${canAfford ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                      {reward.points_cost.toLocaleString('tr-TR')} puan
                    </div>
                    <button
                      disabled={!canRedeem}
                      className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                        canRedeem
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {inStock ? 'Kullan' : 'Tükendi'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400 text-sm">Henüz ödül yok</p>
        )}
      </div>

      {/* Stats */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm space-y-2 border border-gray-200 dark:border-gray-700">
        <p className="text-gray-700 dark:text-gray-300">
          <span className="font-medium">Mevcut:</span> {currentBalance.toLocaleString('tr-TR')} puan
        </p>
        <p className="text-gray-700 dark:text-gray-300">
          <span className="font-medium">Harcanan:</span> {(userPoints?.lifetimeSpent || 0).toLocaleString('tr-TR')} puan
        </p>
        {userPoints?.pendingPoints && userPoints.pendingPoints > 0 && (
          <p className="text-gray-700 dark:text-gray-300">
            <span className="font-medium">Bekleme:</span> {userPoints.pendingPoints.toLocaleString('tr-TR')} puan
          </p>
        )}
      </div>
    </div>
  );
}
