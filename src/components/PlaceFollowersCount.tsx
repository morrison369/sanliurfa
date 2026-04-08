import React, { useState, useEffect } from 'react';

interface PlaceFollowersCountProps {
  placeId: string;
  initialCount?: number;
  showPreview?: boolean;
  previewLimit?: number;
}

export default function PlaceFollowersCount({
  placeId,
  initialCount = 0,
  showPreview = false,
  previewLimit = 5
}: PlaceFollowersCountProps) {
  const [count, setCount] = useState(initialCount);
  const [followers, setFollowers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(showPreview);

  useEffect(() => {
    if (showPreview) {
      loadFollowers();
    }
  }, [placeId, showPreview]);

  const loadFollowers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/places/${placeId}/followers?limit=${previewLimit}`);

      if (response.ok) {
        const data = await response.json();
        setFollowers(data.followers || []);
        setCount(data.count || 0);
      }
    } catch (error) {
      console.error('Failed to load followers', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Follower Count */}
      <div className="flex items-center gap-2">
        <span className="text-2xl">👥</span>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Takipçi</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {count.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Followers Preview */}
      {showPreview && followers.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
            Takip edenler
          </p>
          <div className="space-y-2">
            {followers.slice(0, previewLimit).map((follower) => (
              <a
                key={follower.id}
                href={`/kullanıcı/${follower.id}`}
                className="flex items-center gap-2 hover:opacity-75 transition-opacity group"
              >
                {follower.avatar ? (
                  <img
                    src={follower.avatar}
                    alt={follower.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                    {follower.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:underline">
                    {follower.name}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    @{follower.username}
                  </p>
                </div>
              </a>
            ))}
          </div>

          {count > previewLimit && (
            <a
              href={`/mekan/${placeId}/followers`}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium mt-2 block"
            >
              +{count - previewLimit} daha →
            </a>
          )}
        </div>
      )}

      {isLoading && (
        <div className="text-center py-4">
          <p className="text-xs text-gray-600 dark:text-gray-400">Yükleniyor...</p>
        </div>
      )}
    </div>
  );
}
