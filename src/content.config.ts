import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const imagePathSchema = z.string().min(1);
const slugSchema = z.string().regex(/^[a-z0-9-]+$/, 'Slug sadece küçük harf, rakam ve tire içerebilir');
const tagListSchema = z.array(z.string().min(1)).default([]);
const isoDateSchema = z.coerce.date();

const publishingSchema = {
  author: z.string().min(1).default('Şanlıurfa Rehberi'),
  authorAvatar: z.string().optional(),
  publishedAt: isoDateSchema,
  pubDate: isoDateSchema,
  updatedAt: isoDateSchema.optional(),
  updatedDate: isoDateSchema.optional(),
  readingTime: z.coerce.number().int().positive().default(5),
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
};

const blogCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string().min(1),
    slug: slugSchema.optional(),
    description: z.string().min(1),
    excerpt: z.string().min(1),
    category: z.string().min(1),
    tags: tagListSchema,
    image: imagePathSchema.optional(),
    heroImage: imagePathSchema.optional(),
    thumb: imagePathSchema.optional(),
    views: z.coerce.number().int().nonnegative().default(0),
    ...publishingSchema,
  }),
});

const historicalSitesCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tarihi-yerler' }),
  schema: z.object({
    title: z.string().min(1),
    slug: slugSchema.optional(),
    description: z.string().min(1),
    excerpt: z.string().min(1),
    category: z.string().min(1).default('Tarihi Yerler'),
    period: z.string().min(1),
    location: z.string().min(1),
    tags: tagListSchema,
    image: imagePathSchema.optional(),
    thumb: imagePathSchema.optional(),
    images: z.array(imagePathSchema).default([]),
    entryFee: z.string().optional(),
    openingHours: z.string().optional(),
    coordinates: z
      .object({
        lat: z.coerce.number(),
        lng: z.coerce.number(),
      })
      .optional(),
    isUnesco: z.boolean().default(false),
    isFeatured: z.boolean().default(false),
    ...publishingSchema,
  }),
});

const eventsCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/etkinlikler' }),
  schema: z.object({
    title: z.string().min(1),
    slug: slugSchema.optional(),
    description: z.string().min(1),
    excerpt: z.string().min(1),
    category: z.string().min(1),
    location: z.string().min(1),
    tags: tagListSchema,
    image: imagePathSchema.optional(),
    thumb: imagePathSchema.optional(),
    startDate: isoDateSchema,
    endDate: isoDateSchema.optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    isFeatured: z.boolean().default(false),
    isFree: z.boolean().default(true),
    price: z.string().optional(),
    registrationLink: z.url().optional(),
    ...publishingSchema,
  }),
});

const placesCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/places' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    lat: z.coerce.number(),
    lon: z.coerce.number(),
    category: z.string().min(1),
    type: z.string().min(1),
    tags: tagListSchema,
    image: imagePathSchema,
    thumb: imagePathSchema.optional(),
    address: z.string().min(1),
    hours: z.string().min(1),
    price: z.string().optional(),
    phone: z.string().optional(),
    rating: z.coerce.number().min(0).max(5).default(0),
    reviewCount: z.coerce.number().int().nonnegative().default(0),
  }),
});

export const collections = {
  blog: blogCollection,
  'tarihi-yerler': historicalSitesCollection,
  etkinlikler: eventsCollection,
  places: placesCollection,
};
