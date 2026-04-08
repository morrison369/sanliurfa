import React, { useState, useEffect } from 'react';

interface Reward {
  id: string;
  reward_name: string;
  description: string;
  category: string;
  points_cost: number;
  available_stock: number;
  is_active: boolean;
  tier_requirement?: string;
}

interface LeaderboardUser {
  id: string;
  full_name: string;
  username: string;
  points: number;
  rank: number;
}

export default function AdminLoyaltyPanel() {
  const [activeTab, setActiveTab] = useState<'rewards' | 'award' | 'stats'>('rewards');

  // Rewards Tab
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [errorRewards, setErrorRewards] = useState<string | null>(null);
  const [creatingReward, setCreatingReward] = useState(false);
  const [createForm, setCreateForm] = useState({
    reward_name: '',
    description: '',
    category: 'discount',
    points_cost: '',
    stock_quantity: '',
    is_active: true
  });

  // Award Tab
  const [awardForm, setAwardForm] = useState({
    userId: '',
    type: 'points',
    amount: '',
    badgeKey: '',
    reason: ''
  });
  const [submittingAward, setSubmittingAward] = useState(false);
  const [awardMessage, setAwardMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Stats Tab
  const [topUsers, setTopUsers] = useState<LeaderboardUser[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // Load rewards on mount
  useEffect(() => {
    if (activeTab === 'rewards') {
      fetchRewards();
    } else if (activeTab === 'stats') {
      fetchTopUsers();
    }
  }, [activeTab]);

  // Fetch rewards
  const fetchRewards = async () => {
    try {
      setLoadingRewards(true);
      setErrorRewards(null);
      const response = await fetch('/api/admin/loyalty/rewards');
      if (response.ok) {
        const data = await response.json();
        setRewards(data.data || []);
      } else {
        setErrorRewards('Ödüller yüklenemedi');
      }
    } catch (err) {
      setErrorRewards(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoadingRewards(false);
    }
  };

  // Fetch leaderboard
  const fetchTopUsers = async () => {
    try {
      setLoadingStats(true);
      const response = await fetch('/api/leaderboards/users?sortBy=points&limit=10');
      if (response.ok) {
        const data = await response.json();
        setTopUsers(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Create reward
  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingReward(true);
      setErrorRewards(null);

      const response = await fetch('/api/admin/loyalty/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reward_name: createForm.reward_name,
          description: createForm.description,
          category: createForm.category,
          points_cost: parseInt(createForm.points_cost),
          stock_quantity: createForm.stock_quantity ? parseInt(createForm.stock_quantity) : 0,
          is_active: createForm.is_active
        })
      });

      if (response.ok) {
        const data = await response.json();
        setRewards([data.data, ...rewards]);
        setCreateForm({ reward_name: '', description: '', category: 'discount', points_cost: '', stock_quantity: '', is_active: true });
      } else {
        setErrorRewards('Ödül oluşturulamadı');
      }
    } catch (err) {
      setErrorRewards(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setCreatingReward(false);
    }
  };

  // Award points/badge
  const handleAward = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingAward(true);
      setAwardMessage(null);

      const response = await fetch('/api/admin/loyalty/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: awardForm.userId,
          type: awardForm.type,
          amount: awardForm.type === 'points' ? parseInt(awardForm.amount) : undefined,
          badgeKey: awardForm.type === 'badge' ? awardForm.badgeKey : undefined,
          reason: awardForm.reason
        })
      });

      if (response.ok) {
        setAwardMessage({ type: 'success', text: 'Başarıyla verildi!' });
        setAwardForm({ userId: '', type: 'points', amount: '', badgeKey: '', reason: '' });
      } else {
        const error = await response.json();
        setAwardMessage({ type: 'error', text: error.error || 'Hata oluştu' });
      }
    } catch (err) {
      setAwardMessage({ type: 'error', text: err instanceof Error ? err.message : 'Bir hata oluştu' });
    } finally {
      setSubmittingAward(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Bar */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('rewards')}
          className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
            activeTab === 'rewards'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Ödüller Kataloğu
        </button>
        <button
          onClick={() => setActiveTab('award')}
          className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
            activeTab === 'award'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Puan / Rozet Ver
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
            activeTab === 'stats'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          İstatistikler
        </button>
      </div>

      {/* Tab 1: Rewards Catalog */}
      {activeTab === 'rewards' && (
        <div className="space-y-4">
          {errorRewards && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-sm">
              {errorRewards}
            </div>
          )}

          {/* Create Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white">Yeni Ödül Ekle</h3>
            <form onSubmit={handleCreateReward} className="space-y-3">
              <input
                type="text"
                placeholder="Ödül Adı"
                value={createForm.reward_name}
                onChange={(e) => setCreateForm({ ...createForm, reward_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                required
              />
              <input
                type="text"
                placeholder="Açıklama"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
              <select
                value={createForm.category}
                onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="discount">İndirim</option>
                <option value="experience">Deneyim</option>
                <option value="digital">Dijital</option>
                <option value="physical">Fiziksel</option>
              </select>
              <input
                type="number"
                placeholder="Puan Maliyeti"
                value={createForm.points_cost}
                onChange={(e) => setCreateForm({ ...createForm, points_cost: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                required
              />
              <input
                type="number"
                placeholder="Stok (isteğe bağlı)"
                value={createForm.stock_quantity}
                onChange={(e) => setCreateForm({ ...createForm, stock_quantity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={createForm.is_active}
                  onChange={(e) => setCreateForm({ ...createForm, is_active: e.target.checked })}
                  className="rounded"
                />
                <span className="text-gray-700 dark:text-gray-300">Aktif</span>
              </label>
              <button
                type="submit"
                disabled={creatingReward}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {creatingReward ? 'Ekleniyor...' : 'Ekle'}
              </button>
            </form>
          </div>

          {/* Rewards List */}
          {loadingRewards ? (
            <div className="text-center py-4 text-gray-600 dark:text-gray-400">Yükleniyor...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-white">Adı</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-white">Kategori</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-white">Puan</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-white">Stok</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-white">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {rewards.map((reward) => (
                    <tr key={reward.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-2 text-gray-900 dark:text-white font-medium">{reward.reward_name}</td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{reward.category}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-white font-semibold">{reward.points_cost}</td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{reward.available_stock}</td>
                      <td className="px-4 py-2">
                        {reward.is_active ? (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-medium">
                            Aktif
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400 rounded text-xs font-medium">
                            Pasif
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Award Points/Badge */}
      {activeTab === 'award' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 max-w-md">
          <form onSubmit={handleAward} className="space-y-4">
            <input
              type="text"
              placeholder="Kullanıcı ID"
              value={awardForm.userId}
              onChange={(e) => setAwardForm({ ...awardForm, userId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              required
            />
            <select
              value={awardForm.type}
              onChange={(e) => setAwardForm({ ...awardForm, type: e.target.value as 'points' | 'badge' })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="points">Puan</option>
              <option value="badge">Rozet</option>
            </select>

            {awardForm.type === 'points' ? (
              <input
                type="number"
                placeholder="Puan Miktarı"
                value={awardForm.amount}
                onChange={(e) => setAwardForm({ ...awardForm, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                required
              />
            ) : (
              <input
                type="text"
                placeholder="Rozet Anahtarı"
                value={awardForm.badgeKey}
                onChange={(e) => setAwardForm({ ...awardForm, badgeKey: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                required
              />
            )}

            <input
              type="text"
              placeholder="Neden (gerekli)"
              value={awardForm.reason}
              onChange={(e) => setAwardForm({ ...awardForm, reason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              required
            />

            <button
              type="submit"
              disabled={submittingAward}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {submittingAward ? 'Veriliyor...' : 'Ver'}
            </button>
          </form>

          {awardMessage && (
            <div className={`mt-4 p-3 rounded text-sm ${
              awardMessage.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
            }`}>
              {awardMessage.text}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Stats */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Aktif Ödüller</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {rewards.filter((r) => r.is_active).length}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Toplam Ödüller</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{rewards.length}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">En Çok Puan Kullananlar</h3>
            {loadingStats ? (
              <div className="text-center py-4 text-gray-600 dark:text-gray-400">Yükleniyor...</div>
            ) : (
              <div className="space-y-2">
                {topUsers.map((user, idx) => (
                  <div key={user.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{idx + 1}. {user.full_name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">@{user.username}</p>
                    </div>
                    <p className="font-bold text-blue-600 dark:text-blue-400">{user.points.toLocaleString('tr-TR')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
