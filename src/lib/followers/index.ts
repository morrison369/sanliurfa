// Followers module exports
//
// SCOPE: getFollowers/getFollowing (basit liste, FollowUser tipi `avatar_url`+`bio`),
// getFollowerStats, getMutualFriends, isFollowing, followUser/unfollowUser
// (followUser createNotification ile bildirim tetikler).
//
// PARALEL MODÜL: `lib/following/` — pagination'lı liste (`avatar` alanı, limit+offset)
// ve getFollowerCount/getFollowingCount. İki modül `followers` DB tablosunu paylaşır,
// cache invalidation cross-module coordinate edilmiştir (clearFollowerCache).
export * from './followers';
