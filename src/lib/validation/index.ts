/**
 * Centralized validation schemas using Zod
 * All validation logic in one place for consistency
 */

import { z } from 'zod';

// Common validators
const uuidSchema = z.string().uuid();
const emailSchema = z.string().email('Geçerli bir email adresi giriniz');
const slugSchema = z.string().regex(/^[a-z0-9-]+$/, 'Sadece küçük harf, rakam ve tire kullanılabilir');

// User schemas
export const userRegistrationSchema = z.object({
  email: emailSchema,
  password: z.string()
    .min(8, 'Şifre en az 8 karakter olmalı')
    .regex(/[A-Z]/, 'En az bir büyük harf içermeli')
    .regex(/[a-z]/, 'En az bir küçük harf içermeli')
    .regex(/[0-9]/, 'En az bir rakam içermeli'),
  fullName: z.string()
    .min(2, 'İsim en az 2 karakter olmalı')
    .max(100, 'İsim en fazla 100 karakter olabilir')
    .regex(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/, 'Geçersiz karakter içeriyor'),
});

export const userLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Şifre gereklidir'),
});

// Place schemas
export const placeCreateSchema = z.object({
  name: z.string()
    .min(2, 'Mekan adı en az 2 karakter olmalı')
    .max(100, 'Mekan adı en fazla 100 karakter olabilir'),
  description: z.string()
    .min(10, 'Açıklama en az 10 karakter olmalı')
    .max(2000, 'Açıklama en fazla 2000 karakter olabilir'),
  category: z.enum([
    'restaurant', 'cafe', 'hotel', 'museum', 'park', 
    'shopping', 'entertainment', 'other'
  ]),
  address: z.string().min(5, 'Adres en az 5 karakter olmalı').max(500),
  latitude: z.number().min(37).max(38, 'Geçersiz enlem (Şanlıurfa bölgesi)'),
  longitude: z.number().min(38).max(40, 'Geçersiz boylam (Şanlıurfa bölgesi)'),
  phone: z.string().regex(/^\+?[0-9\s-()]{10,20}$/, 'Geçersiz telefon numarası').optional(),
  website: z.string().url('Geçerli bir URL giriniz').optional().or(z.literal('')),
});

// Review schemas
export const reviewCreateSchema = z.object({
  placeId: uuidSchema,
  rating: z.number().int().min(1).max(5, 'Puan 1-5 arası olmalı'),
  content: z.string()
    .min(10, 'Yorum en az 10 karakter olmalı')
    .max(1000, 'Yorum en fazla 1000 karakter olabilir'),
  images: z.array(z.string().url()).max(5, 'En fazla 5 fotoğraf eklenebilir').optional(),
});

// Search schemas
export const searchQuerySchema = z.object({
  q: z.string().min(2, 'Arama en az 2 karakter olmalı').max(100),
  category: z.enum(['places', 'blog', 'events', 'users']).optional(),
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).default('1').transform(Number),
  limit: z.string().regex(/^\d+$/).default('20').transform(Number)
    .refine(n => n <= 100, 'En fazla 100 kayıt gösterilebilir'),
});

// ID parameter schema
export const idParamSchema = z.object({
  id: uuidSchema,
});

// Email preferences schema
export const emailPreferencesSchema = z.object({
  marketing: z.boolean().default(false),
  notifications: z.boolean().default(true),
  digest: z.enum(['daily', 'weekly', 'monthly', 'never']).default('weekly'),
});

// Type exports
export type UserRegistrationInput = z.infer<typeof userRegistrationSchema>;
export type UserLoginInput = z.infer<typeof userLoginSchema>;
export type PlaceCreateInput = z.infer<typeof placeCreateSchema>;
export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * Validate data against schema
 * Returns { success: true, data } or { success: false, errors }
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): 
  { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = (result.error as any).errors.map((err: any) => `${err.path.join('.')}: ${err.message}`);
  return { success: false, errors };
}

/**
 * Validate partial data (for updates)
 */
export function validatePartial<T>(schema: z.ZodSchema<T>, data: unknown):
  { success: true; data: Partial<T> } | { success: false; errors: string[] } {
  const partialSchema = (schema as any).partial();
  return validate(partialSchema as any, data);
}
