import React, { useState, useEffect } from 'react';

export default function UserRecommendations() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState(new Set());

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      const response = await fetch('/api/recommendations/users?limit=6');
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      setUsers(data.data || []);
    } catch (err) {
      console.error('Error', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFollow = async (userId) => {
    try {
      const method = followingIds.has(userId) ? 'DELETE' : 'POST';
      const response = await fetch('/api/followers/' + userId, { method });
      if (!response.ok) throw new Error('Failed');
      
      const newSet = new Set(followingIds);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      setFollowingIds(newSet);
    } catch (err) {
      console.error('Error', err);
    }
  };

  if (isLoading) return <div className="text-center py-8">Yükleniyor...</div>;
  if (users.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Kime Takip Etmelisin?</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {users.map((user) => (
          <div key={user.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 flex items-center justify-between">
            <a href={'/kullanici/' + user.id} className="flex items-center gap-3 flex-1">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center font-bold">
                  {user.full_name.charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">{user.full_name}</p>
                <p className="text-xs text-gray-600">Level {user.level} • {user.review_count} inceleme</p>
              </div>
            </a>
            <button
              onClick={() => toggleFollow(user.id)}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium"
            >
              Takip Et
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
