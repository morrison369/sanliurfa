const SITE_URL = "https://sanliurfa.com";
const DEFAULT_IMAGE = "/images/og-default.jpg";

export type JsonLdNode = Record<string, any>;

type BreadcrumbItem = {
  name: string;
  url: string;
};

type ReviewLike = {
  rating?: number | string | null;
  title?: string | null;
  content?: string | null;
  full_name?: string | null;
  created_at?: string | Date | null;
};

type PlaceLike = {
  id?: string;
  slug?: string;
  name?: string;
  description?: string | null;
  short_description?: string | null;
  category?: string | null;
  address?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  phone?: string | null;
  website?: string | null;
  opening_hours?: Record<string, string> | string | null;
  images?: string[] | string | null;
  image_url?: string | null;
  rating?: number | string | null;
  average_rating?: number | string | null;
  review_count?: number | string | null;
  rating_count?: number | string | null;
  price_range?: number | string | null;
};

type ArticleLike = {
  slug?: string;
  title?: string;
  excerpt?: string | null;
  content?: string | null;
  featuredImage?: string | null;
  thumbnail?: string | null;
  authorName?: string | null;
  categoryName?: string | null;
  tags?: string[] | null;
  publishedAt?: string | Date | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

type EventLike = {
  slug?: string;
  title?: string;
  description?: string | null;
  image_url?: string | null;
  start_date?: string | Date | null;
  end_date?: string | Date | null;
  start_time?: string | null;
  location?: string | null;
  category?: string | null;
  creator_name?: string | null;
};

type HistoricalSiteLike = {
  slug?: string;
  name?: string;
  description?: string | null;
  short_description?: string | null;
  location?: string | null;
  period?: string | null;
  entry_fee?: string | null;
  entrance_fee?: string | null;
  opening_hours?: string | null;
  visiting_hours?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  images?: string[] | string | null;
  cover_image?: string | null;
  is_unesco?: boolean | null;
};

type RecipeLike = {
  id?: string;
  slug?: string;
  name?: string;
  description?: string | null;
  image?: string | null;
  gallery?: string[] | null;
  ingredients?: string[] | null;
  preparation?: string | null;
  prepTime?: string | null;
  servingSize?: string | null;
  calories?: string | null;
  rating?: number | string | null;
  reviewCount?: number | string | null;
  difficulty?: string | null;
};

const categorySchemaTypes: Record<string, string> = {
  restaurant: "Restaurant",
  restoran: "Restaurant",
  restoranlar: "Restaurant",
  gastronomy: "Restaurant",
  gastronomi: "Restaurant",
  cafe: "CafeOrCoffeeShop",
  kafe: "CafeOrCoffeeShop",
  kafeler: "CafeOrCoffeeShop",
  hotel: "Hotel",
  otel: "Hotel",
  oteller: "Hotel",
  museum: "Museum",
  muze: "Museum",
  müze: "Museum",
  tarihi: "TouristAttraction",
  "tarihi-yerler": "TouristAttraction",
  tarihi_yerler: "TouristAttraction",
  dini: "TouristAttraction",
  turizm: "TouristAttraction",
  park: "Park",
  shopping: "Store",
  alisveris: "Store",
  alışveriş: "Store",
  entertainment: "EntertainmentBusiness",
  eglence: "EntertainmentBusiness",
  eğlence: "EntertainmentBusiness",
};

const dayMap: Record<string, string> = {
  monday: "Mo",
  tuesday: "Tu",
  wednesday: "We",
  thursday: "Th",
  friday: "Fr",
  saturday: "Sa",
  sunday: "Su",
};

export function absoluteUrl(
  value?: string | null,
  fallback = DEFAULT_IMAGE,
): string {
  const path = value && value.trim() ? value.trim() : fallback;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function compactJsonLd<T extends JsonLdNode | JsonLdNode[]>(
  value: T,
): T {
  if (Array.isArray(value)) {
    return value.map((item) => compactJsonLd(item)) as T;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([, entry]) => entry !== undefined && entry !== null && entry !== "",
      )
      .map(([key, entry]) => {
        if (Array.isArray(entry)) {
          return [
            key,
            entry.filter(
              (item) => item !== undefined && item !== null && item !== "",
            ),
          ];
        }

        if (typeof entry === "object") {
          return [key, compactJsonLd(entry as JsonLdNode)];
        }

        return [key, entry];
      })
      .filter(([, entry]) => !(Array.isArray(entry) && entry.length === 0)),
  ) as T;
}

export function toJsonLdGraph(nodes: JsonLdNode | JsonLdNode[]): JsonLdNode {
  const graph = (Array.isArray(nodes) ? nodes : [nodes]).map(
    ({ "@context": _context, ...node }) => compactJsonLd(node),
  );

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

export function buildOrganizationSchema(): JsonLdNode {
  return {
    "@type": ["Organization", "LocalBusiness"],
    "@id": `${SITE_URL}/#organization`,
    name: "sanliurfa.com",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/logo.png"),
    },
    image: absoluteUrl("/images/og-default.jpg"),
    description:
      "Şanlıurfa odaklı şehir rehberi, mekan keşfi ve yerel topluluk platformu.",
    areaServed: {
      "@type": "City",
      name: "Şanlıurfa",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Şanlıurfa",
      addressRegion: "Şanlıurfa",
      addressCountry: "TR",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "info@sanliurfa.com",
      availableLanguage: ["tr"],
    },
  };
}

export function buildWebSiteSchema(): JsonLdNode {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: "sanliurfa.com",
    url: SITE_URL,
    inLanguage: "tr-TR",
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/arama?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    "@id": `${SITE_URL}${items.at(-1)?.url || "/"}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url, "/"),
    })),
  };
}

export function buildPlaceRichSnippet(
  place: PlaceLike,
  options: { path?: string; reviews?: ReviewLike[] } = {},
): JsonLdNode {
  const path = options.path || `/places/${place.slug || place.id || ""}`;
  const url = absoluteUrl(path, "/places");
  const images = normalizeImages(place.images, place.image_url);
  const rating = normalizeRating(place.rating ?? place.average_rating);
  const reviewCount = normalizeCount(place.review_count ?? place.rating_count);

  return compactJsonLd({
    "@type": getPlaceSchemaType(place.category),
    "@id": `${url}#place`,
    name: place.name,
    url,
    mainEntityOfPage: url,
    description: normalizeDescription(
      place.short_description || place.description,
    ),
    image: images,
    priceRange: getPriceRange(place.price_range),
    currenciesAccepted: "TRY",
    telephone: place.phone || undefined,
    sameAs:
      place.website && /^https?:\/\//i.test(place.website)
        ? [place.website]
        : undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: place.address || "Şanlıurfa",
      addressLocality: "Şanlıurfa",
      addressRegion: "Şanlıurfa",
      addressCountry: "TR",
    },
    geo: buildGeo(place.latitude, place.longitude),
    openingHours: normalizeOpeningHours(place.opening_hours),
    aggregateRating:
      rating && reviewCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: rating,
            bestRating: 5,
            worstRating: 1,
            reviewCount,
            ratingCount: reviewCount,
          }
        : undefined,
    review: normalizeReviews(options.reviews),
  });
}

export function buildPlaceItemListSchema(
  places: PlaceLike[],
  pageUrl: string,
): JsonLdNode {
  return compactJsonLd({
    "@type": "ItemList",
    "@id": `${absoluteUrl(pageUrl, "/places")}#itemlist`,
    name: "Şanlıurfa mekanları",
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    numberOfItems: places.length,
    itemListElement: places.map((place, index) => {
      const path = `/places/${place.slug || place.id || ""}`;
      const url = absoluteUrl(path, "/places");
      const item = buildPlaceRichSnippet(place, { path });
      return {
        "@type": "ListItem",
        position: index + 1,
        url,
        item: {
          "@type": item["@type"],
          "@id": item["@id"],
          name: item.name,
          url: item.url,
          image: item.image,
          priceRange: item.priceRange,
          aggregateRating: item.aggregateRating,
        },
      };
    }),
  });
}

export function buildArticleRichSnippet(
  article: ArticleLike,
  path?: string,
): JsonLdNode {
  const articlePath = path || `/blog/${article.slug || ""}`;
  const url = absoluteUrl(articlePath, "/blog");
  const image = absoluteUrl(
    article.featuredImage || article.thumbnail,
    DEFAULT_IMAGE,
  );
  const publishedDate = normalizeDate(article.publishedAt || article.createdAt);
  const modifiedDate = normalizeDate(
    article.updatedAt || article.publishedAt || article.createdAt,
  );

  return compactJsonLd({
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: article.title,
    name: article.title,
    description: normalizeDescription(article.excerpt || article.content),
    image: [image],
    url,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    inLanguage: "tr-TR",
    datePublished: publishedDate,
    dateModified: modifiedDate,
    articleSection: article.categoryName || "Şanlıurfa",
    keywords: article.tags?.length ? article.tags.join(", ") : undefined,
    author: {
      "@type": "Person",
      name: article.authorName || "sanliurfa.com",
    },
    publisher: {
      "@id": `${SITE_URL}/#organization`,
    },
  });
}

export function buildArticleItemListSchema(
  articles: ArticleLike[],
  pageUrl: string,
): JsonLdNode {
  return compactJsonLd({
    "@type": "ItemList",
    "@id": `${absoluteUrl(pageUrl, "/blog")}#itemlist`,
    name: "Şanlıurfa blog yazıları",
    numberOfItems: articles.length,
    itemListElement: articles.map((article, index) => {
      const path = `/blog/${article.slug || ""}`;
      const item = buildArticleRichSnippet(article, path);
      return {
        "@type": "ListItem",
        position: index + 1,
        url: item.url,
        item: {
          "@type": item["@type"],
          "@id": item["@id"],
          headline: item.headline,
          image: item.image,
          datePublished: item.datePublished,
        },
      };
    }),
  });
}

export function buildEventRichSnippet(
  event: EventLike,
  path?: string,
): JsonLdNode {
  const eventPath = path || `/etkinlikler/${event.slug || ""}`;
  const url = absoluteUrl(eventPath, "/etkinlikler");
  const startDate = normalizeEventDate(event.start_date, event.start_time);
  const endDate = normalizeEventDate(
    event.end_date || event.start_date,
    undefined,
  );

  return compactJsonLd({
    "@type": "Event",
    "@id": `${url}#event`,
    name: event.title,
    description: normalizeDescription(event.description),
    image: [absoluteUrl(event.image_url, "/images/placeholder-event.jpg")],
    url,
    mainEntityOfPage: url,
    inLanguage: "tr-TR",
    startDate,
    endDate: endDate !== startDate ? endDate : undefined,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    organizer: {
      "@type": "Organization",
      name: event.creator_name || "sanliurfa.com",
      url: SITE_URL,
    },
    location: {
      "@type": "Place",
      name: event.location || "Şanlıurfa",
      address: {
        "@type": "PostalAddress",
        streetAddress: event.location || "Şanlıurfa",
        addressLocality: "Şanlıurfa",
        addressRegion: "Şanlıurfa",
        addressCountry: "TR",
      },
    },
    offers: {
      "@type": "Offer",
      url,
      price: 0,
      priceCurrency: "TRY",
      availability: "https://schema.org/InStock",
      validFrom: normalizeDate(new Date()),
    },
  });
}

export function buildEventItemListSchema(
  events: EventLike[],
  pageUrl: string,
): JsonLdNode {
  return compactJsonLd({
    "@type": "ItemList",
    "@id": `${absoluteUrl(pageUrl, "/etkinlikler")}#itemlist`,
    name: "Şanlıurfa etkinlikleri",
    numberOfItems: events.length,
    itemListElement: events.map((event, index) => {
      const path = `/etkinlikler/${event.slug || ""}`;
      const item = buildEventRichSnippet(event, path);
      return {
        "@type": "ListItem",
        position: index + 1,
        url: item.url,
        item: {
          "@type": item["@type"],
          "@id": item["@id"],
          name: item.name,
          image: item.image,
          startDate: item.startDate,
          location: item.location,
          offers: item.offers,
        },
      };
    }),
  });
}

export function buildHistoricalSiteRichSnippet(
  site: HistoricalSiteLike,
  path?: string,
): JsonLdNode {
  const sitePath = path || `/tarihi-yerler/${site.slug || ""}`;
  const url = absoluteUrl(sitePath, "/tarihi-yerler");
  const images = normalizeImages(
    site.images,
    site.cover_image || "/images/placeholder-historical.jpg",
  );
  const feeText = site.entry_fee || site.entrance_fee || "Ücretsiz";
  const isFree = /ücretsiz|free|0/i.test(feeText);

  return compactJsonLd({
    "@type": "TouristAttraction",
    "@id": `${url}#touristAttraction`,
    name: site.name,
    url,
    mainEntityOfPage: url,
    description: normalizeDescription(
      site.short_description || site.description,
    ),
    image: images,
    inLanguage: "tr-TR",
    touristType: ["Kültür turizmi", "Tarih turizmi"],
    isAccessibleForFree: isFree,
    award: site.is_unesco ? "UNESCO Dünya Mirası" : undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: site.location || "Şanlıurfa",
      addressLocality: "Şanlıurfa",
      addressRegion: "Şanlıurfa",
      addressCountry: "TR",
    },
    geo: buildGeo(site.latitude, site.longitude),
    openingHours: normalizeTextOpeningHours(
      site.opening_hours || site.visiting_hours,
    ),
    offers: {
      "@type": "Offer",
      url,
      price: isFree ? 0 : undefined,
      priceCurrency: "TRY",
      availability: "https://schema.org/InStock",
      description: feeText,
    },
    additionalProperty: site.period
      ? [
          {
            "@type": "PropertyValue",
            name: "Tarihsel dönem",
            value: site.period,
          },
        ]
      : undefined,
  });
}

export function buildHistoricalSiteItemListSchema(
  sites: HistoricalSiteLike[],
  pageUrl: string,
): JsonLdNode {
  return compactJsonLd({
    "@type": "ItemList",
    "@id": `${absoluteUrl(pageUrl, "/tarihi-yerler")}#itemlist`,
    name: "Şanlıurfa tarihi yerleri",
    numberOfItems: sites.length,
    itemListElement: sites.map((site, index) => {
      const path = `/tarihi-yerler/${site.slug || ""}`;
      const item = buildHistoricalSiteRichSnippet(site, path);
      return {
        "@type": "ListItem",
        position: index + 1,
        url: item.url,
        item: {
          "@type": item["@type"],
          "@id": item["@id"],
          name: item.name,
          image: item.image,
          offers: item.offers,
        },
      };
    }),
  });
}

export function buildRecipeRichSnippet(
  recipe: RecipeLike,
  path?: string,
): JsonLdNode {
  const recipePath = path || `/gastronomi/${recipe.slug || recipe.id || ""}`;
  const url = absoluteUrl(recipePath, "/gastronomi");
  const images = normalizeImages(
    recipe.gallery || [],
    recipe.image || "/images/foods/urfa-kebabi.jpg",
  );
  const rating = normalizeRating(recipe.rating);
  const reviewCount = normalizeCount(recipe.reviewCount);

  return compactJsonLd({
    "@type": "Recipe",
    "@id": `${url}#recipe`,
    name: recipe.name,
    url,
    mainEntityOfPage: url,
    description: normalizeDescription(recipe.description),
    image: images,
    inLanguage: "tr-TR",
    author: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "sanliurfa.com",
    },
    recipeCuisine: "Şanlıurfa mutfağı",
    recipeCategory: "Yöresel yemek",
    recipeIngredient: recipe.ingredients,
    recipeInstructions: normalizeRecipeInstructions(recipe.preparation),
    prepTime: parseDurationToIso(recipe.prepTime),
    totalTime: parseDurationToIso(recipe.prepTime),
    recipeYield: recipe.servingSize,
    keywords: ["Şanlıurfa", "Urfa yemekleri", recipe.name, recipe.difficulty]
      .filter(Boolean)
      .join(", "),
    nutrition: recipe.calories
      ? {
          "@type": "NutritionInformation",
          calories: recipe.calories,
        }
      : undefined,
    aggregateRating:
      rating && reviewCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: rating,
            bestRating: 5,
            worstRating: 1,
            reviewCount,
          }
        : undefined,
  });
}

export function buildRecipeItemListSchema(
  recipes: RecipeLike[],
  pageUrl: string,
): JsonLdNode {
  return compactJsonLd({
    "@type": "ItemList",
    "@id": `${absoluteUrl(pageUrl, "/gastronomi")}#recipes`,
    name: "Şanlıurfa yöresel yemekleri",
    numberOfItems: recipes.length,
    itemListElement: recipes.map((recipe, index) => {
      const path = `/gastronomi/${recipe.slug || recipe.id || ""}`;
      const item = buildRecipeRichSnippet(recipe, path);
      return {
        "@type": "ListItem",
        position: index + 1,
        url: item.url,
        item: {
          "@type": item["@type"],
          "@id": item["@id"],
          name: item.name,
          image: item.image,
          aggregateRating: item.aggregateRating,
        },
      };
    }),
  });
}

function getPlaceSchemaType(category?: string | null): string {
  return (
    categorySchemaTypes[String(category || "").toLowerCase()] || "LocalBusiness"
  );
}

function normalizeDescription(value?: string | null): string {
  const text = String(value || "Şanlıurfa mekan rehberi kaydı.")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 300 ? `${text.slice(0, 297)}...` : text;
}

function normalizeImages(
  images?: string[] | string | null,
  fallback?: string | null,
): string[] {
  const values = Array.isArray(images)
    ? images
    : typeof images === "string" && images.trim().startsWith("{")
      ? images.replace(/[{}"]/g, "").split(",")
      : typeof images === "string"
        ? [images]
        : [];

  const normalized = values
    .map((item) => absoluteUrl(item, fallback || DEFAULT_IMAGE))
    .filter((item, index, source) => source.indexOf(item) === index);

  return normalized.length
    ? normalized
    : [absoluteUrl(fallback, DEFAULT_IMAGE)];
}

function normalizeRating(value?: number | string | null): number | undefined {
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating <= 0) return undefined;
  return Math.min(5, Math.max(1, Number(rating.toFixed(1))));
}

function normalizeCount(value?: number | string | null): number {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.round(count) : 0;
}

function getPriceRange(value?: number | string | null): string {
  const level = Math.min(4, Math.max(1, Number(value) || 2));
  return "₺".repeat(level);
}

function buildGeo(
  latitude?: number | string | null,
  longitude?: number | string | null,
): JsonLdNode | undefined {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;

  return {
    "@type": "GeoCoordinates",
    latitude: lat,
    longitude: lng,
  };
}

function normalizeOpeningHours(
  value?: Record<string, string> | string | null,
): string[] | undefined {
  if (!value || typeof value === "string") return undefined;

  const hours = Object.entries(value)
    .map(([day, range]) => {
      const schemaDay = dayMap[day.toLowerCase()];
      const normalizedRange = String(range).replace(/\s/g, "");
      if (!schemaDay || !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(normalizedRange))
        return undefined;
      return `${schemaDay} ${normalizedRange}`;
    })
    .filter(Boolean) as string[];

  return hours.length ? hours : undefined;
}

function normalizeTextOpeningHours(
  value?: string | null,
): string[] | undefined {
  if (!value) return undefined;
  const text = value.replace(/\s/g, "");
  const match = text.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
  return match ? [`Mo-Su ${match[1]}-${match[2]}`] : undefined;
}

function normalizeDate(value?: string | Date | null): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function normalizeEventDate(
  dateValue?: string | Date | null,
  timeValue?: string | null,
): string | undefined {
  if (!dateValue) return undefined;
  const dateText =
    dateValue instanceof Date
      ? dateValue.toISOString().slice(0, 10)
      : String(dateValue).slice(0, 10);
  const timeText =
    timeValue && /^\d{2}:\d{2}/.test(timeValue)
      ? timeValue.slice(0, 5)
      : "10:00";
  return normalizeDate(`${dateText}T${timeText}:00+03:00`);
}

function normalizeRecipeInstructions(
  value?: string | null,
): JsonLdNode[] | undefined {
  if (!value) return undefined;

  const steps = value
    .split(/\n+/)
    .map((step) => step.replace(/^\s*\d+[\).\s-]*/, "").trim())
    .filter(Boolean);

  return steps.length
    ? steps.map((step) => ({
        "@type": "HowToStep",
        text: step,
      }))
    : undefined;
}

function parseDurationToIso(value?: string | null): string | undefined {
  if (!value) return undefined;
  const hourMatch = value.match(/(\d+)\s*saat/i);
  const minuteMatch = value.match(/(\d+)\s*dk/i);
  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
  if (!hours && !minutes) return undefined;
  return `PT${hours ? `${hours}H` : ""}${minutes ? `${minutes}M` : ""}`;
}

function normalizeReviews(reviews?: ReviewLike[]): JsonLdNode[] | undefined {
  if (!reviews?.length) return undefined;

  const normalized = reviews
    .slice(0, 5)
    .map((review) => {
      const rating = normalizeRating(review.rating);
      const text = normalizeDescription(review.content);
      if (!rating || !text) return undefined;

      return compactJsonLd({
        "@type": "Review",
        name: review.title || "Mekan değerlendirmesi",
        reviewBody: text,
        datePublished: review.created_at
          ? new Date(review.created_at).toISOString()
          : undefined,
        author: {
          "@type": "Person",
          name: review.full_name || "sanliurfa.com kullanıcısı",
        },
        reviewRating: {
          "@type": "Rating",
          ratingValue: rating,
          bestRating: 5,
          worstRating: 1,
        },
      });
    })
    .filter(Boolean) as JsonLdNode[];

  return normalized.length ? normalized : undefined;
}
