import React, { useState, useEffect } from 'react';

interface CollectionItem {
  id: string;
  place_id: string;
  place_name: string;
  place_image?: string;
  place_category?: string;
  place_rating?: number;
  note?: string;
  position: number;
  added_at: string;
}

interface Collection {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  icon?: string;
  is_public: boolean;
  place_count: number;
  follower_count?: number;
  created_at: string;
  updated_at: string;
}

interface CollectionDetailProps {
  collectionId: string;
  currentUserId?: string;
  isAdmin?: boolean;
}

export default function CollectionDetail({
  collectionId,
  currentUserId,
  isAdmin
}: CollectionDetailProps) {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  const [error, setError] = useState('');

  // Load collection on mount
  useEffect(() => {
    loadCollection();
  }, [collectionId, currentUserId]);

  const loadCollection = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/collections/${collectionId}`);
      const data = await response.json();

      if (data.success) {
        setCollection(data.data.collection);
        setItems(data.data.items);
      } else if (response.status === 404) {
        setError('Koleksiyon bulunamadı');
      } else {
        setError(data.error || 'Koleksiyon yüklenemedi');
      }
    } catch (err) {
      console.error('Failed to load collection:', err);
      setError('Koleksiyon yüklenirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }

    // Check follow status if authenticated
    if (currentUserId && collection?.id) {
      checkFollowStatus();
    }
  };

  const checkFollowStatus = async () => {
    try {
      const response = await fetch(`/api/collections/${collectionId}/followers/check`);
      const data = await response.json();
      if (data.success) {
        setIsFollowing(data.data.is_following);
      }
    } catch (err) {
      console.error('Failed to check follow status:', err);
    }
  };

  const handleFollow = async () => {
    if (!currentUserId) {
      alert('Oturum açmanız gerekiyor');
      return;
    }

    try {
      setIsFollowingLoading(true);
      const method = isFollowing ? 'DELETE' : 'POST';
      const response = await fetch(`/api/collections/${collectionId}/followers`, {
        method,
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        setIsFollowing(!isFollowing);
      }
    } catch (err) {
      console.error('Follow error:', err);
    } finally {
      setIsFollowingLoading(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!collection || currentUserId !== collection.user_id) {
      return;
    }

    if (!confirm('Mekanı koleksiyondan kaldırmak istediğinize emin misiniz?')) return;

    try {
      const response = await fetch(`/api/collections/${collectionId}/items/${itemId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setItems(items.filter(item => item.id !== itemId));
      }
    } catch (err) {
      console.error('Remove item error:', err);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Koleksiyon yükleniyor...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!collection) {
    return <div className="text-center py-12 text-gray-500">Koleksiyon bulunamadı</div>;
  }

  const isOwner = currentUserId === collection.user_id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-5xl">{collection.icon}</span>
              <div>
                <h1 className="text-3xl font-bold">{collection.name}</h1>
                {collection.is_public && (
                  <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded inline-block">
                    🌍 Herkese Açık
                  </span>
                )}
              </div>
            </div>

            {collection.description && (
              <p className="text-gray-600 dark:text-gray-400 mb-4">{collection.description}</p>
            )}

            <div className="flex gap-6 text-sm text-gray-500">
              <span>📍 {collection.place_count} mekan</span>
              <span>👥 {collection.follower_count || 0} takipçi</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {collection.is_public && currentUserId && !isOwner && (
              <button
                onClick={handleFollow}
                disabled={isFollowingLoading}
                className={`px-4 py-2 rounded font-medium whitespace-nowrap ${
                  isFollowing
                    ? 'bg-gray-600 text-white hover:bg-gray-700'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                } disabled:opacity-50`}
              >
                {isFollowingLoading ? 'İşleniyor...' : isFollowing ? 'Takipten Çık' : 'Takip Et'}
              </button>
            )}

            {isOwner && (
              <a
                href={`/koleksiyonlar`}
                className="px-4 py-2 bg-gray-500 text-white rounded font-medium text-center hover:bg-gray-600"
              >
                Düzenle
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Mekanlar</h2>

        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Bu koleksiyonda henüz mekan eklenmemiş
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(item => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition"
              >
                {/* Image */}
                {item.place_image && (
                  <div className="aspect-video bg-gray-200 overflow-hidden">
                    <img
                      src={item.place_image}
                      alt={item.place_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="p-4">
                  <a
                    href={`/mekan/${item.place_id}`}
                    className="text-lg font-bold text-blue-600 hover:text-blue-700 block mb-2"
                  >
                    {item.place_name}
                  </a>

                  <div className="flex gap-3 text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {item.place_category && <span>📁 {item.place_category}</span>}
                    {item.place_rating && (
                      <span>⭐ {item.place_rating.toFixed(1)}</span>
                    )}
                  </div>

                  {item.note && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 p-2 bg-gray-100 dark:bg-gray-700 rounded">
                      "{item.note}"
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <a
                      href={`/mekan/${item.place_id}`}
                      className="flex-1 text-center bg-blue-100 text-blue-700 px-3 py-2 rounded text-sm font-medium hover:bg-blue-200 transition"
                    >
                      Mekanı Gör
                    </a>
                    {isOwner && (
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="flex-1 bg-red-100 text-red-700 px-3 py-2 rounded text-sm font-medium hover:bg-red-200 transition"
                      >
                        Kaldır
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
