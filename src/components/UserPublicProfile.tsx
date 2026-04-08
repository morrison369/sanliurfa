import React, { useState, useEffect } from "react";

export default function UserPublicProfile({ userId, currentUserId }) {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBlocking, setIsBlocking] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);

  useEffect(() => {
    fetch("/api/users/" + userId + "/profile")
      .then(r => r.json())
      .then(d => { setProfile(d.data); setIsLoading(false); })
      .catch(() => setIsLoading(false));

    // Check blocking status if current user exists
    if (currentUserId) {
      fetch("/api/blocking/check?user_id=" + userId)
        .then(r => r.json())
        .then(d => setIsBlocked(d.data?.blocked_user || false))
        .catch(() => {});

      // Check following status
      fetch("/api/following/check?user_id=" + userId)
        .then(r => r.json())
        .then(d => setIsFollowing(d.data?.is_following || false))
        .catch(() => {});
    }
  }, [userId, currentUserId]);

  const handleFollow = async () => {
    if (isFollowingLoading) return;
    setIsFollowingLoading(true);
    const currentlyFollowing = isFollowing;
    try {
      const endpoint = currentlyFollowing ? '/api/following/unfollow' : '/api/following';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followed_id: userId })
      });

      if (response.ok) {
        setIsFollowing(!currentlyFollowing);
      }
    } catch (err) {
      console.error('Follow error:', err);
    } finally {
      setIsFollowingLoading(false);
    }
  };

  const handleBlock = async () => {
    setIsBlocking(true);
    try {
      const method = isBlocked ? 'DELETE' : 'POST';
      const url = isBlocked ? `/api/blocking?blocked_id=${userId}` : '/api/blocking';
      const body = isBlocked ? undefined : JSON.stringify({ blocked_id: userId });

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body
      });

      if (response.ok) {
        setIsBlocked(!isBlocked);
      }
    } catch (err) {
      console.error('Block error:', err);
    } finally {
      setIsBlocking(false);
    }
  };

  if (isLoading) return <div className="text-center py-12">Loading...</div>;
  if (!profile) return <div>Profile not found</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-6">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center text-3xl font-bold">{profile.full_name.charAt(0)}</div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{profile.full_name}</h1>
            {profile.bio && <p className="text-gray-600 mb-4">{profile.bio}</p>}
            <div className="flex gap-4 mb-4">
              <div><p className="text-2xl font-bold">{profile.stats.followers}</p><p className="text-sm">Followers</p></div>
              <div><p className="text-2xl font-bold">{profile.stats.following}</p><p className="text-sm">Following</p></div>
            </div>
            {!profile.is_own_profile && currentUserId && (
              <div className="flex gap-2">
                <a href="/mesajlar" className="px-4 py-2 bg-blue-500 text-white rounded inline-block">
                  Mesaj Gönder
                </a>
                <button
                  onClick={handleFollow}
                  disabled={isFollowingLoading}
                  className={`px-4 py-2 rounded text-white ${isFollowing ? 'bg-gray-600 hover:bg-gray-700' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {isFollowingLoading ? 'İşleniyor...' : isFollowing ? 'Takipten Çık' : 'Takip Et'}
                </button>
                <button
                  onClick={handleBlock}
                  disabled={isBlocking}
                  className={`px-4 py-2 rounded text-white ${isBlocked ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  {isBlocking ? 'İşleniyor...' : isBlocked ? 'Engellemeyi Kaldır' : 'Engelle'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}