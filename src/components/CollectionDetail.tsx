import React, { useState, useEffect } from "react";
import { getApiErrorMessage, unwrapApiPayload } from "@/lib/client-api";

interface CollectionItem {
  id: string;
  place_id: string;
  place_name: string;
  place_slug?: string;
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
  is_following?: boolean;
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
  isAdmin,
}: CollectionDetailProps) {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  const [error, setError] = useState("");

  // Load collection on mount
  useEffect(() => {
    loadCollection();
  }, [collectionId, currentUserId]);

  const loadCollection = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/collections/${collectionId}`);
      const json = await response.json();
      const data = unwrapApiPayload<{
        success?: boolean;
        data?: { collection: Collection; items: CollectionItem[] };
      }>(json);

      if (data.success) {
        setCollection(data.data?.collection || null);
        setItems(data.data?.items || []);
        setIsFollowing(Boolean(data.data?.collection?.is_following));
      } else if (response.status === 404) {
        setError("Koleksiyon bulunamadı");
      } else {
        setError(getApiErrorMessage(json, "Koleksiyon yüklenemedi"));
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Koleksiyon yüklenirken bir hata oluştu",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUserId) {
      alert("Oturum açmanız gerekiyor");
      return;
    }

    try {
      setIsFollowingLoading(true);
      const response = await fetch(`/api/collections/${collectionId}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await response.json();

      const data = unwrapApiPayload<{ success?: boolean; following?: boolean }>(
        json,
      );

      if (!response.ok || !data.success) {
        throw new Error(getApiErrorMessage(json, "Takip işlemi başarısız"));
      }

      setIsFollowing(Boolean(data.following));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Takip işlemi başarısız");
    } finally {
      setIsFollowingLoading(false);
    }
  };

  const handleRemoveItem = async (item: CollectionItem) => {
    if (!collection || currentUserId !== collection.user_id) {
      return;
    }

    if (!confirm("Mekânı koleksiyondan kaldırmak istediğinize emin misiniz?"))
      return;

    try {
      const response = await fetch(
        `/api/collections/${collectionId}/items?placeId=${encodeURIComponent(item.place_id)}`,
        {
          method: "DELETE",
        },
      );
      const json = await response.json();

      const data = unwrapApiPayload<{ success?: boolean }>(json);

      if (!response.ok || !data.success) {
        throw new Error(
          getApiErrorMessage(json, "Mekân koleksiyondan kaldırılamadı"),
        );
      }

      setItems(items.filter((existingItem) => existingItem.id !== item.id));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Mekân koleksiyondan kaldırılamadı",
      );
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Koleksiyon yükleniyor...</div>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100">
        {error}
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="text-center py-12 text-gray-500">
        Koleksiyon bulunamadı
      </div>
    );
  }

  const isOwner = currentUserId === collection.user_id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="rounded-full bg-urfa-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-urfa-800 dark:bg-urfa-900/40 dark:text-urfa-100">
                {collection.icon || "Rota"}
              </span>
              <div>
                <h1 className="text-3xl font-bold">{collection.name}</h1>
                {collection.is_public && (
                  <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded inline-block">
                    Herkese açık
                  </span>
                )}
              </div>
            </div>

            {collection.description && (
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {collection.description}
              </p>
            )}

            <div className="flex gap-6 text-sm text-gray-500">
              <span>{collection.place_count} mekân</span>
              <span>{collection.follower_count || 0} takipçi</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {collection.is_public && currentUserId && !isOwner && (
              <button
                onClick={handleFollow}
                disabled={isFollowingLoading}
                className={`px-4 py-2 rounded font-medium whitespace-nowrap ${
                  isFollowing
                    ? "bg-gray-600 text-white hover:bg-gray-700"
                    : "bg-urfa-700 text-white hover:bg-urfa-800"
                } disabled:opacity-50`}
              >
                {isFollowingLoading
                  ? "İşleniyor..."
                  : isFollowing
                    ? "Takipten çık"
                    : "Takip et"}
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
        <h2 className="text-2xl font-bold mb-4">Mekânlar</h2>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-urfa-200 bg-urfa-50/60 p-8 text-center text-gray-700 dark:border-urfa-900 dark:bg-urfa-900/10 dark:text-gray-300">
            Bu koleksiyonda henüz mekân yok. Şanlıurfa gezi, yemek veya tarih
            rotası oluşturmak için mekânları favorilerinize ekleyebilirsiniz.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition"
              >
                {/* Image */}
                <div className="aspect-video bg-urfa-50 overflow-hidden">
                  {item.place_image ? (
                    <img
                      src={item.place_image}
                      alt={item.place_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs font-bold uppercase tracking-[0.22em] text-urfa-800">
                      Şanlıurfa
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <a
                    href={`/places/${item.place_slug || item.place_id}`}
                    className="text-lg font-bold text-urfa-700 hover:text-urfa-800 dark:text-urfa-300 dark:hover:text-urfa-200 block mb-2"
                  >
                    {item.place_name}
                  </a>

                  <div className="flex gap-3 text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {item.place_category && <span>{item.place_category}</span>}
                    {item.place_rating && (
                      <span>{item.place_rating.toFixed(1)} puan</span>
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
                      href={`/places/${item.place_slug || item.place_id}`}
                      className="flex-1 text-center bg-urfa-100 text-urfa-800 px-3 py-2 rounded text-sm font-medium hover:bg-urfa-200 transition"
                    >
                      Mekânı gör
                    </a>
                    {isOwner && (
                      <button
                        onClick={() => handleRemoveItem(item)}
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
