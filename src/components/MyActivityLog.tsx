import React, { useState, useEffect } from "react";
import { unwrapApiPayload } from "@/lib/client-api";

export default function MyActivityLog() {
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const response = await fetch("/api/activity?limit=50");
      if (!response.ok) throw new Error("Aktiviteler yüklenemedi");
      const data = unwrapApiPayload<{ data?: any[] }>(await response.json());
      setActivities(data.data || []);
    } catch (err) {
      console.error("Aktivite yükleme hatası", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="text-center py-8">Yükleniyor...</div>;

  const getActivityIcon = (type: string) => {
    const icons: Record<string, string> = {
      review_created: "⭐",
      favorite_added: "❤️",
      comment_posted: "💬",
      collection_created: "📚",
      user_followed: "👥",
    };
    return icons[type] || "📌";
  };

  const getActivityText = (type: string) => {
    const texts: Record<string, string> = {
      review_created: "İnceleme yazdın",
      favorite_added: "Favorilere ekledin",
      comment_posted: "Yorum yaptın",
      collection_created: "Koleksiyon oluşturdun",
      user_followed: "Kullanıcı takip ettin",
    };
    return texts[type] || "Aktivite";
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Benim Aktivitelerim
      </h2>

      {activities.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            Henüz aktivite yok
          </p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Mekân yorumu yazdığınızda, favori eklediğinizde veya koleksiyon
            oluşturduğunuzda Şanlıurfa katkılarınız burada listelenir.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a
              href="/places"
              className="text-sm font-medium text-urfa-600 hover:text-urfa-700"
            >
              Mekânları keşfet
            </a>
            <a
              href="/koleksiyonlar"
              className="text-sm font-medium text-urfa-600 hover:text-urfa-700"
            >
              Koleksiyon oluştur
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">
                  {getActivityIcon(activity.actionType)}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {getActivityText(activity.actionType)}
                  </p>
                  {activity.metadata?.placeName && (
                    <p className="text-sm text-gray-600">
                      {activity.metadata.placeName}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(activity.createdAt).toLocaleDateString("tr-TR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
