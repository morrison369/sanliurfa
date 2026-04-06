import { defineCollection, z } from 'astro:content';

// Blog yazıları koleksiyonu
const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    author: z.string().default('Admin'),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

// Tarihi yerler koleksiyonu
const historicalSitesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    period: z.string(),
    location: z.string(),
    entryFee: z.string().optional(),
    openingHours: z.string().optional(),
    images: z.array(z.string()).default([]),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
    isUnesco: z.boolean().default(false),
    isFeatured: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
  }),
});

// Etkinlikler koleksiyonu
const eventsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    location: z.string(),
    category: z.string(),
    image: z.string().optional(),
    isFeatured: z.boolean().default(false),
    isFree: z.boolean().default(true),
    price: z.string().optional(),
    registrationLink: z.string().optional(),
  }),
});

export const collections = {
  'blog': blogCollection,
  'tarihi-yerler': historicalSitesCollection,
  'etkinlikler': eventsCollection,
};
