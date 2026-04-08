import React, { useState, useEffect } from "react";

export default function LeaderboardsDisplay() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [sortBy, setSortBy] = useState("points");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [sortBy]);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/leaderboards/users?sortBy=" + sortBy + "&limit=50");
      if (!response.ok) throw new Error("Failed to load");
      const data = await response.json();
      setLeaderboard(data.data || []);
    } catch (err) {
      console.error("Error loading leaderboard", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 mb-6">
        <button onClick={() => setSortBy("points")} className={sortBy === "points" ? "px-4 py-2 bg-blue-500 text-white rounded" : "px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"}>
          Puanla
        </button>
        <button onClick={() => setSortBy("level")} className={sortBy === "level" ? "px-4 py-2 bg-blue-500 text-white rounded" : "px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"}>
          Seviyeye
        </button>
        <button onClick={() => setSortBy("activity")} className={sortBy === "activity" ? "px-4 py-2 bg-blue-500 text-white rounded" : "px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"}>
          Aktiviteye
        </button>
        <button onClick={() => setSortBy("recent")} className={sortBy === "recent" ? "px-4 py-2 bg-blue-500 text-white rounded" : "px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"}>
          Yeniye
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Yukluniyor...</div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((user) => (
            <a key={user.id} href={"/kullanici/" + user.id} className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
              <div className="text-2xl font-bold text-blue-600 w-12 text-center">{"#" + user.rank}</div>
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold">{user.full_name.charAt(0)}</div>
              )}
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">{user.full_name}</p>
                <p className="text-sm text-gray-600">@{user.username || "kullanici"}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">{user.points}</p>
                <p className="text-xs text-gray-600">Level {user.level}</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}