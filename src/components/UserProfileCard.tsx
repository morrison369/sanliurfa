import React, { useState } from 'react';

interface User {
  id: string;
  full_name: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  points: number;
  level: number;
  created_at: string;
}

interface Stats {
  reviews: number;
  favorites: number;
  comments: number;
  badges: number;
}

interface FollowerStats {
  followers_count: number;
  following_count: number;
  is_following: boolean;
  is_follower: boolean;
}

interface UserProfileCardProps {
  user: User;
  stats: Stats;
  currentUserId?: string;
}

export default function UserProfileCard({ user, stats, currentUserId }: UserProfileCardProps) {
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [followerStats, setFollowerStats] = useState<FollowerStats | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);

  React.useEffect(() => {
    loadFollowerStats();
  }, [user.id]);

  const loadFollowerStats = async () => {
    try {
      const response = await fetch(`/api/followers/stats?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setFollowerStats(data.data);
        setIsFollowing(data.data.is_following);
      }
    } catch (err) {
      console.error('Failed to load follower stats:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleToggleFollow = async () => {
    if (!currentUserId || !followerStats) return;

    setIsLoadingFollow(true);

    try {
      const response = await fetch('/api/followers', {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      if (response.ok) {
        setIsFollowing(!isFollowing);
        await loadFollowerStats();
      }
    } catch (err) {
      console.error('Failed to toggle follow:', err);
    } finally {
      setIsLoadingFollow(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageContent.trim() || !currentUserId) return;

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: user.id,
          content: messageContent.trim()
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Mesaj gönderilemedi');
      }

      setSuccess(true);
      setMessageContent('');
      setTimeout(() => {
        setIsMessageModalOpen(false);
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsSending(false);
    }
  };

  const getLevelColor = (level: number) => {
    if (level <= 1) return 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white';
    if (level <= 5) return 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100';
    if (level <= 10) return 'bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100';
    return 'bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100';
  };

  return (
    <div>
      {/* Header with navigation */}
      <div className="mb-8">
        <a href="/" className="text-blue-600 hover:underline text-sm">
          ← Ana sayfa
        </a>
      </div>

      {/* Profile Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 max-w-2xl mx-auto">
        {/* Cover background */}
        <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-500 rounded-t-lg"></div>

        {/* Profile content */}
        <div className="px-6 pb-6">
          {/* Avatar and basic info */}
          <div className="flex flex-col sm:flex-row gap-6 -mt-16 mb-6">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="w-32 h-32 rounded-lg border-4 border-white dark:border-gray-800 object-cover"
              />
            ) : (
              <div className="w-32 h-32 rounded-lg border-4 border-white dark:border-gray-800 bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 text-4xl">
                👤
              </div>
            )}

            <div className="flex-1 pt-16 sm:pt-8">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {user.full_name}
                  </h1>
                  {user.username && (
                    <p className="text-gray-600 dark:text-gray-400">@{user.username}</p>
                  )}
                </div>
                <div className={`px-4 py-2 rounded-lg font-medium text-sm ${getLevelColor(user.level)}`}>
                  Level {user.level}
                </div>
              </div>

              {user.bio && (
                <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md">{user.bio}</p>
              )}

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Katılım: {formatDate(user.created_at)}
              </p>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8 py-6 border-t border-b border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.reviews}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Yorum</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.favorites}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Favori</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.comments}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Yorum</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {user.points}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Puan</p>
            </div>
            {followerStats && (
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {followerStats.followers_count}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Takipçi</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          {currentUserId && currentUserId !== user.id && (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setIsMessageModalOpen(true)}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                💬 Mesaj Gönder
              </button>
              <button
                onClick={handleToggleFollow}
                disabled={isLoadingFollow}
                className={`flex-1 px-6 py-3 rounded-lg transition-colors font-medium ${
                  isFollowing
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                } disabled:opacity-50`}
              >
                {isLoadingFollow ? '...' : isFollowing ? '✓ Takip Ediliyorsunuz' : '+ Takip Et'}
              </button>
            </div>
          )}

          {currentUserId === user.id && (
            <div className="flex gap-3">
              <a
                href="/profil"
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
              >
                Profil Düzenle
              </a>
              <a
                href="/mesajlar"
                className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium text-center"
              >
                Mesajlarım
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Message Modal */}
      {isMessageModalOpen && currentUserId && currentUserId !== user.id && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {user.full_name}'e Mesaj Gönder
              </h2>
              <button
                onClick={() => setIsMessageModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            {success ? (
              <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 text-center">
                ✓ Mesaj başarıyla gönderildi!
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-red-600 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Mesajınızı yazın..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-4"
                  rows={4}
                  maxLength={5000}
                  disabled={isSending}
                />

                <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  {messageContent.length}/5000
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsMessageModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                    disabled={isSending}
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageContent.trim() || isSending}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {isSending ? 'Gönderiliyor...' : 'Gönder'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
