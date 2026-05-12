// Following module exports
//
// SCOPE: getFollowers/getFollowing (pagination'lı liste, FollowUser tipi `avatar` alanı,
// followers_count + following_count gömülü), getFollowerCount, getFollowingCount,
// isFollowing, followUser/unfollowUser (notification YOK).
//
// PARALEL MODÜL: `lib/followers/` — basit liste (avatar_url+bio), getFollowerStats,
// getMutualFriends, followUser createNotification ile bildirim. İki modül aynı `followers`
// DB tablosunu paylaşır, cache invalidation cross-module coordinate edilmiştir.
export * from './following';
