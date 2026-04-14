import { defineCollection, z } from 'astro:content';

// Blog collection schema
const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    description: z.string().optional(),
    excerpt: z.string(),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    author: z.string().default('Şanlıurfa Rehberi'),
    authorAvatar: z.string().optional(),
    publishedAt: z.string().or(z.date()).optional(),
    pubDate: z.string().or(z.date()).optional(),
    updatedAt: z.string().or(z.date()).optional(),
    readingTime: z.number().default(5),
    image: z.string().optional(),
    featured: z.boolean().default(false),
    views: z.number().default(0),
  }),
});

// Places collection schema
const placesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    subcategory: z.string().optional(),
    lat: z.number().optional(),
    lon: z.number().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    email: z.string().optional(),
    openingHours: z.string().optional(),
    features: z.array(z.string()).default([]),
    priceRange: z.enum(['free', 'cheap', 'moderate', 'expensive', 'luxury']).optional(),
    image: z.string().optional(),
    images: z.array(z.string()).default([]),
    rating: z.number().min(1).max(5).optional(),
    reviewCount: z.number().default(0),
    isVerified: z.boolean().default(false),
    isFeatured: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    source: z.string().optional(),
    osmId: z.string().optional(),
    wikiUrl: z.string().optional(),
    addedAt: z.string().or(z.date()).optional(),
  }),
});

export const collections = {
  blog: blogCollection,
  places: placesCollection,
};
