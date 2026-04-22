import React, { useState, useEffect } from "react";
import { getApiErrorMessage, unwrapApiPayload } from "@/lib/client-api";

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

interface CollectionsManagerProps {
  userId: string;
}

export default function CollectionsManager({
  userId,
}: CollectionsManagerProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionForm, setNewCollectionForm] = useState({
    name: "",
    description: "",
    icon: "Rota",
    is_public: false,
  });
  const [error, setError] = useState("");

  // Load collections on mount
  useEffect(() => {
    loadCollections();
  }, [userId]);

  const loadCollections = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/collections?userId=${userId}`);
      const json = await response.json();
      const data = unwrapApiPayload<{ success?: boolean; data?: Collection[] }>(
        json,
      );

      if (!response.ok || !data.success) {
        throw new Error(getApiErrorMessage(json, "Koleksiyonlar yüklenemedi"));
      }

      setCollections(data.data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Koleksiyonlar yüklenemedi",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCollectionForm.name.trim()) {
      setError("Koleksiyon adı gereklidir");
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCollectionForm.name,
          description: newCollectionForm.description || undefined,
          icon: newCollectionForm.icon,
          is_public: newCollectionForm.is_public,
        }),
      });

      const json = await response.json();
      const data = unwrapApiPayload<{ success?: boolean; data?: Collection }>(
        json,
      );

      if (!response.ok || !data.success) {
        throw new Error(getApiErrorMessage(json, "Koleksiyon oluşturulamadı"));
      }

      if (data.data) {
        setCollections([data.data, ...collections]);
      }
      setNewCollectionForm({
        name: "",
        description: "",
        icon: "Rota",
        is_public: false,
      });
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Koleksiyon oluşturulurken bir hata oluştu",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCollection = async (collectionId: string, name: string) => {
    if (!confirm(`"${name}" koleksiyonunu silmek istediğinize emin misiniz?`))
      return;

    try {
      const response = await fetch(`/api/collections/${collectionId}`, {
        method: "DELETE",
      });

      const json = await response.json();
      const data = unwrapApiPayload<{ success?: boolean }>(json);

      if (!response.ok || !data.success) {
        throw new Error(getApiErrorMessage(json, "Koleksiyon silinemedi"));
      }

      setCollections(collections.filter((c) => c.id !== collectionId));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Koleksiyon silinirken bir hata oluştu",
      );
    }
  };

  return (
    <div className="space-y-8">
      {/* Create New Collection Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-2xl font-bold mb-4">Yeni koleksiyon oluştur</h2>

        <form onSubmit={handleCreateCollection} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Adı *</label>
              <input
                type="text"
                value={newCollectionForm.name}
                onChange={(e) =>
                  setNewCollectionForm({
                    ...newCollectionForm,
                    name: e.target.value,
                  })
                }
                placeholder="Örn: Şanlıurfa'da gezilecek yerler"
                className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-urfa-500 dark:border-gray-600 dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Etiket</label>
              <input
                type="text"
                value={newCollectionForm.icon}
                onChange={(e) =>
                  setNewCollectionForm({
                    ...newCollectionForm,
                    icon: e.target.value,
                  })
                }
                placeholder="Rota"
                maxLength={16}
                className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-urfa-500 dark:border-gray-600 dark:bg-gray-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Açıklama</label>
            <textarea
              value={newCollectionForm.description}
              onChange={(e) =>
                setNewCollectionForm({
                  ...newCollectionForm,
                  description: e.target.value,
                })
              }
              placeholder="Bu koleksiyon hakkında kısa bir açıklama yazın..."
              rows={3}
              className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-urfa-500 dark:border-gray-600 dark:bg-gray-700"
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newCollectionForm.is_public}
                onChange={(e) =>
                  setNewCollectionForm({
                    ...newCollectionForm,
                    is_public: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded text-urfa-700 focus:ring-urfa-500"
              />
              <span className="text-sm font-medium">Herkese açık yap</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Açık koleksiyonlar diğer kullanıcılar tarafından görülüp takip
              edilebilir
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isCreating}
            className="w-full rounded bg-urfa-700 py-2 font-medium text-white transition-colors hover:bg-urfa-800 disabled:opacity-50"
          >
            {isCreating ? "Oluşturuluyor..." : "Koleksiyon oluştur"}
          </button>
        </form>
      </div>

      {/* Collections List */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Koleksiyonlarım</h2>

        {isLoading ? (
          <div className="text-center py-12">Koleksiyonlar yükleniyor...</div>
        ) : collections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-urfa-200 bg-urfa-50/60 p-8 text-center text-gray-700 dark:border-urfa-900 dark:bg-urfa-900/10 dark:text-gray-300">
            Henüz koleksiyon oluşturmadınız. Şanlıurfa yemek, tarih veya hafta
            sonu rotalarınızı burada düzenleyebilirsiniz.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((collection) => (
              <div
                key={collection.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-urfa-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-urfa-800 dark:bg-urfa-900/40 dark:text-urfa-100">
                      {collection.icon || "Rota"}
                    </span>
                    <div>
                      <h3 className="font-bold text-lg">{collection.name}</h3>
                      {collection.is_public && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Herkese açık
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                {collection.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {collection.description}
                  </p>
                )}

                {/* Stats */}
                <div className="flex gap-4 text-sm text-gray-500 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <span>{collection.place_count} mekân</span>
                  {collection.follower_count !== undefined && (
                    <span>{collection.follower_count} takipçi</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <a
                    href={`/koleksiyonlar/${collection.id}`}
                    className="flex-1 rounded bg-urfa-100 px-3 py-2 text-center text-sm font-medium text-urfa-800 transition hover:bg-urfa-200"
                  >
                    Aç
                  </a>
                  <button
                    onClick={() =>
                      handleDeleteCollection(collection.id, collection.name)
                    }
                    className="flex-1 bg-red-100 text-red-700 px-3 py-2 rounded text-center text-sm font-medium hover:bg-red-200 transition"
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
