import React, { useState, useEffect } from "react";
import { unwrapApiPayload } from "@/lib/client-api";

export default function PointsHistory() {
  const [history, setHistory] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setError(null);
      const response = await fetch("/api/users/points-history");
      if (!response.ok) throw new Error("Puan geçmişi yüklenemedi");
      const data = unwrapApiPayload<{ data?: any }>(await response.json());
      setHistory(data.data);
    } catch (err) {
      console.error("Puan geçmişi yükleme hatası", err);
      setError(err instanceof Error ? err.message : "Puan geçmişi yüklenemedi");
      setHistory(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-600 dark:text-gray-400">
        Yükleniyor...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <p className="font-semibold">Puan geçmişi şu anda alınamadı.</p>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }

  if (!history || (!history.summary?.length && !history.history?.length)) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Henüz puan geçmişi yok
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Yorum yazdığınızda, favori eklediğinizde veya etkinliğe katıldığınızda
          puan hareketleri burada görünür.
        </p>
        <a
          href="/places"
          className="mt-5 inline-flex rounded-lg bg-urfa-700 px-5 py-2.5 font-medium text-white hover:bg-urfa-800"
        >
          Mekân keşfet
        </a>
      </div>
    );
  }

  const getActivityLabel = (type: string) => {
    const labels: Record<string, string> = {
      review_created: "İnceleme",
      comment_posted: "Yorum",
      favorite_added: "Favori",
    };
    return labels[type] || "Aktivite";
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Puan geçmişi
      </h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {history.summary.map((item: any) => (
          <div
            key={item.action_type}
            className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200"
          >
            <p className="text-sm text-gray-600">
              {getActivityLabel(item.action_type)}
            </p>
            <p className="text-2xl font-bold text-urfa-700">
              {item.total_points}
            </p>
            <p className="text-xs text-gray-500">{item.count} kez</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {history.history.map((entry: any) => (
          <div
            key={entry.id}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-urfa-50 px-3 py-1 text-xs font-semibold text-urfa-800">
                {getActivityLabel(entry.action_type)}
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {getActivityLabel(entry.action_type)}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(entry.created_at).toLocaleDateString("tr-TR")}
                </p>
              </div>
            </div>
            <span className="text-sm font-bold text-urfa-700">
              +{entry.points_earned || 10}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
