export type CuratedUser = {
  rank?: number;
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  bio: string;
  points: number;
  level: number;
  created_at: string;
  activity_count: number;
  badge_count: number;
  review_count: number;
  favorite_count: number;
};

export const curatedUsers: CuratedUser[] = [
  {
    id: "curated-user-gobeklitepe-rehberi",
    full_name: "Göbeklitepe Rehberi",
    username: "gobeklitepe_rehberi",
    avatar_url: null,
    bio: "Şanlıurfa tarihi, Göbeklitepe rotaları ve kültür gezileri hakkında öneriler paylaşır.",
    points: 9850,
    level: 12,
    created_at: "2026-01-12T09:00:00.000Z",
    activity_count: 86,
    badge_count: 9,
    review_count: 34,
    favorite_count: 42,
  },
  {
    id: "curated-user-urfa-lezzetleri",
    full_name: "Urfa Lezzetleri",
    username: "urfa_lezzetleri",
    avatar_url: null,
    bio: "Urfa kebabı, çiğ köfte, isot ve yöresel tatlılar için Şanlıurfa gastronomi notları.",
    points: 8720,
    level: 11,
    created_at: "2026-01-28T11:30:00.000Z",
    activity_count: 74,
    badge_count: 8,
    review_count: 41,
    favorite_count: 28,
  },
  {
    id: "curated-user-balikligol-gunlugu",
    full_name: "Balıklıgöl Günlüğü",
    username: "balikligol_gunlugu",
    avatar_url: null,
    bio: "Balıklıgöl, tarihi çarşı ve Şanlıurfa merkezinde yürüyüş rotaları önerir.",
    points: 7310,
    level: 9,
    created_at: "2026-02-06T14:15:00.000Z",
    activity_count: 59,
    badge_count: 7,
    review_count: 26,
    favorite_count: 35,
  },
  {
    id: "curated-user-harran-kesfi",
    full_name: "Harran Keşfi",
    username: "harran_kesfi",
    avatar_url: null,
    bio: "Harran evleri, tarih durakları ve Şanlıurfa çevre gezileri için yerel keşif önerileri.",
    points: 6840,
    level: 8,
    created_at: "2026-02-20T08:45:00.000Z",
    activity_count: 51,
    badge_count: 6,
    review_count: 22,
    favorite_count: 31,
  },
  {
    id: "curated-user-sanliurfa-aile-rotalari",
    full_name: "Şanlıurfa Aile Rotaları",
    username: "sanliurfa_aile",
    avatar_url: null,
    bio: "Aileyle gezilecek mekânlar, çocuk dostu duraklar ve şehir servisleri hakkında pratik bilgiler.",
    points: 5920,
    level: 7,
    created_at: "2026-03-04T10:10:00.000Z",
    activity_count: 44,
    badge_count: 5,
    review_count: 19,
    favorite_count: 27,
  },
];

export function getCuratedLeaderboard(
  sortBy = "points",
  limit = 50,
): CuratedUser[] {
  const sortedUsers = [...curatedUsers].sort((a, b) => {
    switch (sortBy) {
      case "level":
        return b.level - a.level || b.points - a.points;
      case "activity":
        return b.activity_count - a.activity_count || b.points - a.points;
      case "recent":
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case "points":
      default:
        return b.points - a.points || b.level - a.level;
    }
  });

  return sortedUsers.slice(0, limit).map((user, index) => ({
    ...user,
    rank: index + 1,
  }));
}

export function searchCuratedUsers(
  query: string,
  sortBy = "relevance",
  limit = 50,
): CuratedUser[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");

  const matchedUsers = normalizedQuery
    ? curatedUsers.filter((user) =>
        [user.full_name, user.username, user.bio]
          .join(" ")
          .toLocaleLowerCase("tr-TR")
          .includes(normalizedQuery),
      )
    : curatedUsers;

  const sortedUsers =
    sortBy === "relevance"
      ? matchedUsers
      : getCuratedLeaderboard(sortBy, curatedUsers.length).filter((user) =>
          matchedUsers.some((matchedUser) => matchedUser.id === user.id),
        );

  return sortedUsers.slice(0, limit);
}
