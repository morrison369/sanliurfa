import React, { useState, useEffect } from "react";
import { unwrapApiPayload } from "@/lib/client-api";
import { getCuratedLeaderboard } from "@/data/curated-users";

export default function LeaderboardsDisplay() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState("points");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [sortBy]);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        "/api/leaderboards/users?sortBy=" + sortBy + "&limit=50",
      );
      if (!response.ok) throw new Error("Liderlik tablosu yüklenemedi");
      const data = unwrapApiPayload<{ data?: any[] }>(await response.json());
      const results = data.data || [];
      setLeaderboard(
        results.length > 0 ? results : getCuratedLeaderboard(sortBy, 10),
      );
    } catch (err) {
      console.error("Liderlik tablosu yüklenemedi", err);
      setLeaderboard(getCuratedLeaderboard(sortBy, 10));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSortBy("points")}
          className={
            sortBy === "points"
              ? "px-4 py-2 bg-urfa-600 text-white rounded"
              : "px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
          }
        >
          Puanla
        </button>
        <button
          onClick={() => setSortBy("level")}
          className={
            sortBy === "level"
              ? "px-4 py-2 bg-urfa-600 text-white rounded"
              : "px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
          }
        >
          Seviyeye
        </button>
        <button
          onClick={() => setSortBy("activity")}
          className={
            sortBy === "activity"
              ? "px-4 py-2 bg-urfa-600 text-white rounded"
              : "px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
          }
        >
          Aktiviteye
        </button>
        <button
          onClick={() => setSortBy("recent")}
          className={
            sortBy === "recent"
              ? "px-4 py-2 bg-urfa-600 text-white rounded"
              : "px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
          }
        >
          Yeniye
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Yükleniyor...</div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((user, index) => (
            <a
              key={user.id}
              href={"/kullanici/" + user.id}
              className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="text-2xl font-bold text-urfa-600 w-12 text-center">
                {"#" + (user.rank || index + 1)}
              </div>
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-urfa-100 to-isot-100 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-sm font-bold text-urfa-700 dark:text-urfa-100">
                  {user.full_name.charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  {user.full_name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  @{user.username || "kullanici"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {user.points}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Seviye {user.level}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
