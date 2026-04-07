import React, { useState } from 'react';

interface Props {
  userId: string;
}

export default function UserPublicProfile({ userId }: Props) {
  const [isFollowing, setIsFollowing] = useState(false);

  const mockUser = {
    name: 'Kullanıcı Adı',
    joinedDate: '2024-01-15',
    reviews: 24,
    followers: 156,
    following: 43,
    badges: ['Reviewer', 'Helpful'],
    reputationPoints: 345
  };

  return (
    <div className="container-custom py-8">
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-8 mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {mockUser.name[0]}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{mockUser.name}</h1>
              <p className="text-gray-600 dark:text-gray-400">{mockUser.reputationPoints} puan • {mockUser.joinedDate} tarihinde katıldı</p>
              <div className="flex gap-2 mt-2">
                {mockUser.badges.map(badge => (
                  <span key={badge} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-full text-sm font-semibold">
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsFollowing(!isFollowing)}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              isFollowing
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isFollowing ? 'Takip Ediliyor' : 'Takip Et'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockUser.reviews}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Yorum</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockUser.followers}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Takipçi</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockUser.following}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Takip Ediliyor</p>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Son Yorumlar</h2>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <p className="font-semibold text-gray-900 dark:text-white">Harika bir yer! ⭐⭐⭐⭐⭐</p>
                <span className="text-sm text-gray-500 dark:text-gray-400">2 gün önce</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-3">Bu yer gerçekten süper. Tarih ve doğası harika!</p>
              <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                <button>👍 Faydalı (12)</button>
                <button>👎 Faydasız (1)</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
