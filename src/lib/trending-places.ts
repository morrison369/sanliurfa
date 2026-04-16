export interface TrendingPlace {
  id: string;
  name: string;
  category: string;
  rating: number;
  review_count: number;
  engagement_score: number;
}

export function renderTrendingStars(rating: number): string {
  return Array.from({ length: 5 })
    .map((_, index) =>
      index < Math.floor(rating)
        ? '<span class="text-yellow-400">★</span>'
        : '<span class="text-gray-300">★</span>',
    )
    .join('');
}

export function renderTrendingPlaces(items: TrendingPlace[]): string {
  return items
    .map(
      (place, index) => `
        <a href="/mekanlari-bul/${place.id}" class="flex items-start gap-3 p-4 transition hover:bg-gray-50 dark:hover:bg-gray-700/40">
          <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600">
            ${index + 1}
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="truncate font-semibold text-gray-900 dark:text-white">${place.name}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">${place.category}</p>
            <div class="mt-1 flex items-center gap-2">
              <div class="flex items-center gap-1">${renderTrendingStars(place.rating)}</div>
              <span class="text-xs text-gray-500 dark:text-gray-400">(${place.review_count})</span>
            </div>
          </div>
        </a>
      `,
    )
    .join('');
}
