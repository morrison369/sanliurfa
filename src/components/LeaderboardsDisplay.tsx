import { useState, useEffect } from 'react';
interface LeaderboardUser {
 id: string;
 rank: number;
 avatar_url?: string;
 full_name: string;
 username?: string;
 points: number;
 level: number;
}

export default function LeaderboardsDisplay() {
 const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
 const [sortBy, setSortBy] = useState("points");
 const [isLoading, setIsLoading] = useState(true);

 useEffect(() => {
 fetchLeaderboard();
 }, [sortBy]);

 const fetchLeaderboard = async () => {
 setIsLoading(true);
 try {
 const response = await fetch("/api/leaderboards/users?sortBy=" + sortBy + "&limit=50");
 if (!response.ok) throw new Error("Liderlik tablosu yüklenemedi.");
 const data = await response.json();
 setLeaderboard(data.data || []);
 } catch (err) {
 console.error("Liderlik tablosu yüklenemedi:", err);
 } finally {
 setIsLoading(false);
 }
 };

 return (
 <div className="space-y-6">
 <div className="flex gap-2 mb-6">
 <button onClick={() => setSortBy("points")} className={sortBy === "points" ? "px-4 py-2 bg-urfa-600 text-white rounded" : "px-4 py-2 border border-[rgba(184,115,51,0.25)] rounded hover:bg-[rgba(184,115,51,0.04)]"}>
 Puanla
 </button>
 <button onClick={() => setSortBy("level")} className={sortBy === "level" ? "px-4 py-2 bg-urfa-600 text-white rounded" : "px-4 py-2 border border-[rgba(184,115,51,0.25)] rounded hover:bg-[rgba(184,115,51,0.04)]"}>
 Seviyeye
 </button>
 <button onClick={() => setSortBy("activity")} className={sortBy === "activity" ? "px-4 py-2 bg-urfa-600 text-white rounded" : "px-4 py-2 border border-[rgba(184,115,51,0.25)] rounded hover:bg-[rgba(184,115,51,0.04)]"}>
 Aktiviteye
 </button>
 <button onClick={() => setSortBy("recent")} className={sortBy === "recent" ? "px-4 py-2 bg-urfa-600 text-white rounded" : "px-4 py-2 border border-[rgba(184,115,51,0.25)] rounded hover:bg-[rgba(184,115,51,0.04)]"}>
 Yeniye
 </button>
 </div>

 {isLoading ? (
 <div className="space-y-2">
 {Array.from({ length: 6 }).map((_, i) => (
 <div key={i} className="flex items-center gap-4 p-4 bg-[var(--bg-card)] border border-[rgba(184,115,51,0.14)] rounded-sm animate-pulse">
 <div className="w-12 h-6 bg-[rgba(184,115,51,0.08)] rounded" />
 <div className="w-12 h-12 rounded-full bg-[rgba(184,115,51,0.08)] shrink-0" />
 <div className="flex-1 space-y-2">
 <div className="h-4 bg-[rgba(184,115,51,0.08)] rounded w-32" />
 <div className="h-3 bg-[rgba(184,115,51,0.06)] rounded w-20" />
 </div>
 <div className="space-y-1 text-right">
 <div className="h-5 bg-[rgba(184,115,51,0.08)] rounded w-16" />
 <div className="h-3 bg-[rgba(184,115,51,0.06)] rounded w-12" />
 </div>
 </div>
 ))}
 </div>
 ) : leaderboard.length === 0 ? (
 <div className="text-center py-12 text-[#7A6B58]">
 <div className="text-4xl mb-3">🏆</div>
 <p>Henüz liderlik tablosunda kimse yok.</p>
 </div>
 ) : (
 <div className="space-y-2">
 {leaderboard.map((user) => (
 <a key={user.id} href={"/kullanici/" + user.id} className="flex items-center gap-4 p-4 bg-[var(--bg-card)] border border-[rgba(184,115,51,0.14)] rounded-sm hover:shadow-md transition-shadow">
 <div className="text-2xl font-bold text-[#7A6B58] w-12 text-center">{"#" + user.rank}</div>
 {user.avatar_url ? (
 <img src={user.avatar_url} alt={user.full_name} className="w-12 h-12 rounded-full object-cover" />
 ) : (
 <div className="w-12 h-12 rounded-full bg-[rgba(184,115,51,0.12)] flex items-center justify-center text-sm font-bold">{user.full_name.charAt(0)}</div>
 )}
 <div className="flex-1">
 <p className="font-medium text-[#1F1410]">{user.full_name}</p>
 <p className="text-sm text-[#7A6B58]">@{user.username || "kullanici"}</p>
 </div>
 <div className="text-right">
 <p className="text-lg font-bold text-[#1F1410]">{user.points}</p>
 <p className="text-xs text-[#7A6B58]">Seviye {user.level}</p>
 </div>
 </a>
 ))}
 </div>
 )}
 </div>
 );
}
