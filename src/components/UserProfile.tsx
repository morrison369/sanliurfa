import React, { useState, useEffect } from 'react';

interface UserData {
  id: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string;
}

interface ActivityItem {
  id: number;
  userId: string;
  actionType: string;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface TabType {
  id: 'profile' | 'favorites' | 'activity' | 'settings' | 'security';
  label: string;
  icon: string;
}

export default function UserProfile() {
  const [activeTab, setActiveTab] = useState<TabType['id']>('profile');
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (activeTab === 'activity' && user) {
      loadActivity();
    }
  }, [activeTab, user]);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      const userData = await response.json();
      setUser({
        id: userData.id,
        email: userData.email,
        fullName: userData.full_name,
        role: userData.role,
        createdAt: userData.created_at
      });
    } catch (error) {
      console.error('Failed to load user data', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadActivity = async () => {
    if (!user) return;
    try {
      const response = await fetch('/api/activity');
      if (!response.ok) {
        throw new Error('Failed to fetch activity');
      }
      const data = await response.json();
      setActivity(data.data || []);
    } catch (error) {
      console.error('Failed to load activity', error);
    }
  };

  const getActivityIcon = (actionType: string): string => {
    switch (actionType) {
      case 'review_created':
        return '✍️';
      case 'favorite_added':
        return '❤️';
      case 'badge_earned':
        return '🏅';
      case 'level_up':
        return '⬆️';
      case 'comment_posted':
        return '💬';
      case 'points_earned':
        return '⭐';
      default:
        return '📌';
    }
  };

  const getActivityDescription = (item: ActivityItem): string => {
    switch (item.actionType) {
      case 'review_created':
        return `"${item.metadata?.placeName || 'bir yere'}" yorum yaptı`;
      case 'favorite_added':
        return `"${item.metadata?.placeName || 'bir yeri'}" favorilerine ekledi`;
      case 'badge_earned':
        return `"${item.metadata?.badgeName || 'Rozet'}" rozeti kazandı`;
      case 'level_up':
        return `Level ${item.metadata?.newLevel || '?'} oldu`;
      case 'comment_posted':
        return 'Blog yazısına yorum yaptı';
      case 'points_earned':
        return `${item.metadata?.points || 0} puan kazandı`;
      default:
        return 'Bir eylem gerçekleştirdi';
    }
  };

  const tabs: TabType[] = [
    { id: 'profile', label: 'Profil', icon: '👤' },
    { id: 'favorites', label: 'Favorileri', icon: '❤️' },
    { id: 'activity', label: 'Aktivite', icon: '📊' },
    { id: 'settings', label: 'Ayarlar', icon: '⚙️' },
    { id: 'security', label: 'Güvenlik', icon: '🔒' }
  ];

  if (isLoading || !user) {
    return (
      <div className="container-custom py-12 text-center text-gray-600">
        Yükleniyor...
      </div>
    );
  }

  return (
    <div className="container-custom py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profilim</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Profil bilgileri ve tercihlerini yönet</p>
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                E-posta
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 mt-1">Doğrulanmış</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ad Soyad
              </label>
              <input
                type="text"
                defaultValue={user.fullName}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rol
              </label>
              <input
                type="text"
                value={user.role === 'user' ? 'Kullanıcı' : user.role}
                disabled
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Katılım Tarihi
              </label>
              <input
                type="text"
                value={new Date(user.createdAt).toLocaleDateString('tr-TR')}
                disabled
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white disabled:opacity-50"
              />
            </div>

            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              Değişiklikleri Kaydet
            </button>
          </div>
        </div>
      )}

      {/* Favorites Tab */}
      {activeTab === 'favorites' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p className="text-lg mb-2">❤️</p>
            <p>Henüz favori yeriniz yok</p>
            <a href="/arama" className="text-blue-600 hover:underline mt-2 block">
              Yerleri keşfet →
            </a>
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          {activity.length > 0 ? (
            <div className="space-y-4">
              {activity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                >
                  <span className="text-2xl">{getActivityIcon(item.actionType)}</span>
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-white font-medium">
                      {getActivityDescription(item)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(item.createdAt).toLocaleDateString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p className="text-lg mb-2">📊</p>
              <p>Henüz bir aktivite yok</p>
              <a href="/arama" className="text-blue-600 hover:underline mt-2 block">
                Yerleri keşfet ve yorum yazmaya başla →
              </a>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Bildirim Tercihlerim
              </h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-gray-700 dark:text-gray-300">Yorum bildirimleri</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-gray-700 dark:text-gray-300">Favori güncellemeleri</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="rounded" />
                  <span className="text-gray-700 dark:text-gray-300">Haftalık özet e-posta</span>
                </label>
              </div>
            </div>

            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              Kaydet
            </button>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Şifremi Değiştir
              </h3>
              <div className="space-y-4">
                <input
                  type="password"
                  placeholder="Eski şifre"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="password"
                  placeholder="Yeni şifre"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="password"
                  placeholder="Yeni şifre (tekrar)"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  Şifreyi Güncelle
                </button>
              </div>
            </div>

            <hr className="border-gray-200 dark:border-gray-700" />

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Kişisel Verilerim
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Tüm kişisel verilerinizi indir (GDPR)
              </p>
              <a
                href="/api/export/user-data?format=json"
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium inline-block"
              >
                Verileri İndir
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
