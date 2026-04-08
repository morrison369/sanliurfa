import React, { useState, useEffect } from 'react';

interface HashtagItem {
  id: string;
  tag_name: string;
  tag_slug: string;
  usage_count: number;
  trending_rank?: number;
  is_trending?: boolean;
}

interface Place {
  id: string;
  name: string;
  slug: string;
  category: string;
  rating_avg: number;
  address: string;
  tagged_at: string;
}

interface Review {
  id: string;
  content: string;
  rating: number;
  created_at: string;
  user_name: string;
  username: string;
  place_name: string;
  place_slug: string;
  tagged_at: string;
}

interface HashtagMeta {
  id: string;
  tag_name: string;
  tag_slug: string;
  usage_count: number;
  is_trending: boolean;
  trending_rank?: number;
  created_at: string;
}

interface TaggedContent {
  hashtag: HashtagMeta;
  places: Place[];
  reviews: Review[];
  places_count: number;
  reviews_count: number;
}

interface Props {
  initialSlug?: string;
}

export default function HashtagExplorer({ initialSlug }: Props) {
  const [hashtags, setHashtags] = useState<HashtagItem[]>([]);
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(initialSlug || null);
  const [taggedContent, setTaggedContent] = useState<TaggedContent | null>(null);
  const [isLoadingHashtags, setIsLoadingHashtags] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch trending hashtags on mount
  useEffect(() => {
    const fetchHashtags = async () => {
      try {
        setIsLoadingHashtags(true);
        const response = await fetch('/api/hashtags?limit=20&period=week');
        if (response.ok) {
          const data = await response.json();
          setHashtags(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch hashtags:', err);
        setError('Trend konuları yüklenemedi');
      } finally {
        setIsLoadingHashtags(false);
      }
    };
    fetchHashtags();
  }, []);

  // Fetch content for selected hashtag
  useEffect(() => {
    if (!selectedHashtag) return;

    const fetchContent = async () => {
      try {
        setIsLoadingContent(true);
        setTaggedContent(null);
        const response = await fetch(`/api/hashtags/${selectedHashtag}?limit=20`);
        if (response.ok) {
          const data = await response.json();
          setTaggedContent(data);
          // Update URL
          window.history.pushState(null, '', `/sosyal?tag=${selectedHashtag}`);
        } else if (response.status === 404) {
          setError('Hashtag bulunamadı');
        }
      } catch (err) {
        console.error('Failed to fetch hashtag content:', err);
        setError('İçerik yüklenemedi');
      } finally {
        setIsLoadingContent(false);
      }
    };

    fetchContent();
  }, [selectedHashtag]);

  const handleHashtagClick = (slug: string) => {
    setSelectedHashtag(slug);
  };

  if (isLoadingHashtags) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded">
          {error}
        </div>
      )}

      {/* Trending hashtags chip row */}
      {hashtags.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Trend Konular</h3>
          <div className="flex flex-wrap gap-2">
            {hashtags.map((tag) => (
              <button
                key={tag.tag_slug}
                onClick={() => handleHashtagClick(tag.tag_slug)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedHashtag === tag.tag_slug
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                #{tag.tag_name}
                <span className="ml-1 text-xs opacity-75">({tag.usage_count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tagged content section */}
      {selectedHashtag && (
        <div className="space-y-4">
          {isLoadingContent ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              ))}
            </div>
          ) : taggedContent && (taggedContent.places_count > 0 || taggedContent.reviews_count > 0) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tagged Places */}
              {taggedContent.places_count > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    İşaretlenen Mekanlar ({taggedContent.places_count})
                  </h4>
                  <div className="space-y-2">
                    {taggedContent.places.map((place) => (
                      <a
                        key={place.id}
                        href={`/mekan/${place.slug}`}
                        className="block p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-colors"
                      >
                        <div className="font-semibold text-gray-900 dark:text-white text-sm">
                          {place.name}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {place.category} • ⭐ {place.rating_avg.toFixed(1)}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Tagged Reviews */}
              {taggedContent.reviews_count > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    İşaretlenen İncelemeler ({taggedContent.reviews_count})
                  </h4>
                  <div className="space-y-2">
                    {taggedContent.reviews.map((review) => (
                      <div
                        key={review.id}
                        className="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="font-semibold text-gray-900 dark:text-white text-sm">
                            {review.user_name}
                          </div>
                          <div className="text-xs text-yellow-500">★ {review.rating}</div>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                          {review.content}
                        </p>
                        <a
                          href={`/mekan/${review.place_slug}`}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {review.place_name}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              Henüz içerik yok
            </div>
          )}
        </div>
      )}

      {/* No hashtags message */}
      {!selectedHashtag && hashtags.length === 0 && !isLoadingHashtags && (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          Henüz trend konu yok
        </div>
      )}
    </div>
  );
}
