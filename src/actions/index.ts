import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro/zod';

import {
  runLoginFlow,
  runLoginTwoFactorFlow,
  runRegisterFlow,
} from '../lib/auth/auth-flows';
import {
  createAdminEvent,
  deleteAdminEvent,
  updateAdminEvent,
} from '../lib/admin/events-admin';
import {
  createAdminHistoricalSite,
  deleteAdminHistoricalSite,
  updateAdminHistoricalSite,
} from '../lib/admin/historical-sites-admin';
import { updateAdminMessageStatus } from '../lib/admin/message-status';
import { subscribeToBlogNewsletter } from '../lib/blog/newsletter-subscriptions';
import { submitContactRequest } from '../lib/contact/contact-submission';
import {
  logPasswordResetError,
  requestPasswordReset,
  resetPasswordWithToken,
} from '../lib/auth/password-reset';
import { getPublicAppUrl } from '../lib/public-app-url';
import { submitPlaceApplication } from '../lib/places/place-application';
import { moderateReview } from '../lib/review/admin-review-moderation';
import { submitPlaceReview } from '../lib/review/review-submission';
import {
  changeAccountPassword,
  updateProfileSettings,
} from '../lib/user/profile-settings';
import { safeErrorDetail } from '../lib/api';

const emailSchema = z
  .string()
  .trim()
  .pipe(z.email({ error: 'Geçerli bir e-posta adresi girin.' }));
const passwordSchema = z.string().min(6, 'Şifre en az 6 karakter olmalıdır.');

function getClientIp(headers: Headers): string | null {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
}

export const server = {
  login: defineAction({
    accept: 'form',
    input: z.object({
      email: emailSchema,
      password: z.string().min(1, 'Şifre zorunludur.'),
      remember: z.coerce.boolean().optional(),
    }),
    handler: async ({ email, password }, context) => {
      try {
        return await runLoginFlow({ email, password }, context.cookies);
      } catch (error) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message:
            error instanceof Error && error.message ? error.message : 'Giriş başarısız.',
        });
      }
    },
  }),

  verifyLoginTwoFactor: defineAction({
    accept: 'form',
    input: z.object({
      tempToken: z.string().trim().min(1, 'Geçici token zorunludur.'),
      code: z
        .string()
        .trim()
        .regex(/^\d{6}$/, 'Kod 6 haneli bir sayı olmalıdır.'),
    }),
    handler: async ({ tempToken, code }, context) => {
      try {
        return await runLoginTwoFactorFlow({ tempToken, code }, context.cookies);
      } catch (error) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message:
            error instanceof Error && error.message
              ? error.message
              : 'İki adımlı doğrulama başarısız.',
        });
      }
    },
  }),

  register: defineAction({
    accept: 'form',
    input: z
      .object({
        name: z.string().trim().min(2, 'Ad soyad en az 2 karakter olmalıdır.'),
        email: emailSchema,
        password: passwordSchema,
        passwordConfirm: passwordSchema,
        terms: z.coerce.boolean().refine(value => value, {
          message: 'Kayıt için kullanım koşullarını kabul etmelisiniz.',
        }),
      })
      .superRefine((value, ctx) => {
        if (value.password !== value.passwordConfirm) {
          ctx.addIssue({
            code: 'custom',
            message: 'Şifreler eşleşmiyor.',
            path: ['passwordConfirm'],
          });
        }
      }),
    handler: async ({ name, email, password }, context) => {
      try {
        return await runRegisterFlow({ fullName: name, email, password }, context.cookies);
      } catch (error) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message:
            error instanceof Error && error.message ? error.message : 'Kayıt tamamlanamadı.',
        });
      }
    },
  }),

  requestPasswordReset: defineAction({
    accept: 'form',
    input: z.object({
      email: emailSchema,
    }),
    handler: async ({ email }) => {
      try {
        await requestPasswordReset(email, getPublicAppUrl());
        return {
          success: true,
          message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.',
        };
      } catch (error) {
        logPasswordResetError('Password reset request action failed', error);
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Şifre sıfırlama bağlantısı gönderilemedi.',
        });
      }
    },
  }),

  resetPassword: defineAction({
    accept: 'form',
    input: z
      .object({
        token: z.string().trim().min(1, 'Geçersiz veya eksik token.'),
        password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır.'),
        confirm_password: z.string().min(6, 'Şifre tekrarı zorunludur.'),
      })
      .superRefine((value, ctx) => {
        if (value.password !== value.confirm_password) {
          ctx.addIssue({
            code: 'custom',
            message: 'Şifreler eşleşmiyor.',
            path: ['confirm_password'],
          });
        }
      }),
    handler: async ({ token, password }) => {
      try {
        await resetPasswordWithToken(token, password);
        return {
          success: true,
          message: 'Şifreniz güncellendi.',
        };
      } catch (error) {
        logPasswordResetError('Password reset action failed', error);
        throw new ActionError({
          code: 'BAD_REQUEST',
          message:
            error instanceof Error && error.message
              ? error.message
              : 'Şifre güncellenemedi.',
        });
      }
    },
  }),

  subscribeBlogNewsletter: defineAction({
    accept: 'form',
    input: z.object({
      email: emailSchema,
    }),
    handler: async ({ email }) => {
      const result = await subscribeToBlogNewsletter(email);
      return {
        success: true,
        alreadySubscribed: result.alreadySubscribed,
        message: result.alreadySubscribed
          ? 'Bu e-posta adresi zaten blog bültenine kayıtlı.'
          : 'Başarıyla abone oldunuz. Yeni yazılar e-posta adresinize gönderilecek.',
      };
    },
  }),

  submitPlaceReview: defineAction({
    accept: 'form',
    input: z.object({
      placeId: z.string().trim().min(1, 'Mekan bilgisi eksik.'),
      rating: z.coerce.number().int().min(1, 'Lütfen puan seçin.').max(5, 'Puan 5 üzerinde olamaz.'),
      title: z.string().trim().max(100, 'Başlık en fazla 100 karakter olabilir.').optional(),
      content: z
        .string()
        .trim()
        .min(10, 'Yorum en az 10 karakter olmalıdır.')
        .max(2000, 'Yorum en fazla 2000 karakter olabilir.'),
      visitDate: z.string().trim().optional(),
    }),
    handler: async ({ placeId, rating, title, content, visitDate }, context) => {
      const user = context.locals.user;
      if (!user?.id) {
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: 'Yorum yazmak için giriş yapmalısınız.',
        });
      }

      try {
        return await submitPlaceReview(
          { id: user.id, email: user.email || null },
          {
            placeId,
            rating,
            title,
            content,
            visitType: visitDate || null,
            awardUserPoints: true,
            ipAddress: getClientIp(context.request.headers),
            userAgent: context.request.headers.get('user-agent') || null,
          },
        );
      } catch (error) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: safeErrorDetail(error, 'Yorum gönderilemedi.'),
        });
      }
    },
  }),

  submitContactRequest: defineAction({
    accept: 'form',
    input: z.object({
      name: z.string().trim().min(2, 'Ad soyad en az 2 karakter olmalıdır.'),
      email: emailSchema,
      phone: z.string().trim().optional(),
      subject: z.string().trim().min(3, 'Konu en az 3 karakter olmalıdır.').max(200),
      message: z.string().trim().min(10, 'Mesaj en az 10 karakter olmalıdır.').max(5000),
      type: z.string().trim().optional(),
      placeId: z.string().trim().optional(),
    }),
    handler: async input => {
      try {
        return await submitContactRequest({
          name: input.name,
          email: input.email || '',
          phone: input.phone || null,
          subject: input.subject,
          message: input.message,
          type: input.type || 'general',
          placeId: input.placeId || null,
        });
      } catch (error) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: safeErrorDetail(error, 'Mesaj gönderilemedi.'),
        });
      }
    },
  }),

  submitPlaceApplication: defineAction({
    accept: 'form',
    input: z.object({
      name: z.string().trim().min(2, 'İşletme adı en az 2 karakter olmalıdır.'),
      category_id: z.string().trim().min(1, 'Kategori seçin.'),
      district_id: z.string().trim().min(1, 'İlçe seçin.'),
      phone: z.string().trim().min(10, 'Telefon numarası geçersiz.'),
      website: z.string().trim().optional(),
      address: z.string().trim().min(5, 'Açık adres en az 5 karakter olmalıdır.'),
      short_description: z.string().trim().max(200, 'Açıklama en fazla 200 karakter olabilir.').optional(),
      owner_name: z.string().trim().min(2, 'Ad soyad en az 2 karakter olmalıdır.'),
      owner_email: emailSchema,
    }),
    handler: async input => {
      try {
        return await submitPlaceApplication({
          name: input.name,
          categoryId: input.category_id,
          districtId: input.district_id,
          phone: input.phone,
          website: input.website || null,
          address: input.address,
          shortDescription: input.short_description || null,
          ownerName: input.owner_name,
          ownerEmail: input.owner_email,
        });
      } catch (error) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: safeErrorDetail(error, 'Başvuru gönderilemedi.'),
        });
      }
    },
  }),

  updateProfileSettings: defineAction({
    accept: 'form',
    input: z.object({
      full_name: z.string().trim().max(120, 'Ad soyad en fazla 120 karakter olabilir.').optional(),
      username: z
        .string()
        .trim()
        .max(30, 'Kullanıcı adı en fazla 30 karakter olabilir.')
        .optional(),
      bio: z.string().trim().max(500, 'Hakkımda alanı en fazla 500 karakter olabilir.').optional(),
    }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user?.id) {
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: 'Profil ayarları için giriş yapmalısınız.',
        });
      }

      try {
        return await updateProfileSettings(
          { id: user.id },
          {
            fullName: input.full_name || null,
            username: input.username || null,
            bio: input.bio || null,
          },
        );
      } catch (error) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: safeErrorDetail(error, 'Profil güncellenemedi.'),
        });
      }
    },
  }),

  changeAccountPassword: defineAction({
    accept: 'form',
    input: z
      .object({
        current_password: z.string().min(1, 'Mevcut şifre zorunludur.'),
        new_password: z.string().min(6, 'Yeni şifre en az 6 karakter olmalıdır.'),
        confirm_password: z.string().min(6, 'Şifre tekrarı zorunludur.'),
      })
      .superRefine((value, ctx) => {
        if (value.new_password !== value.confirm_password) {
          ctx.addIssue({
            code: 'custom',
            message: 'Yeni şifreler eşleşmiyor.',
            path: ['confirm_password'],
          });
        }
      }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user?.id) {
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: 'Şifre değiştirmek için giriş yapmalısınız.',
        });
      }

      try {
        return await changeAccountPassword(
          { id: user.id },
          {
            currentPassword: input.current_password,
            newPassword: input.new_password,
            confirmPassword: input.confirm_password,
          },
        );
      } catch (error) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: safeErrorDetail(error, 'Şifre güncellenemedi.'),
        });
      }
    },
  }),

  updateAdminMessageStatus: defineAction({
    accept: 'form',
    input: z.object({
      id: z.string().trim().min(1, 'Mesaj bilgisi eksik.'),
      status: z.string().trim().min(1, 'Durum bilgisi eksik.'),
    }),
    handler: async ({ id, status }, context) => {
      if (!context.locals.isAdmin) {
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: 'Admin yetkisi gerekli.',
        });
      }

      try {
        return await updateAdminMessageStatus({
          id,
          status,
          adminId: context.locals.user?.id || null,
        });
      } catch (error) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: safeErrorDetail(error, 'Mesaj durumu güncellenemedi.'),
        });
      }
    },
  }),

  moderateReview: defineAction({
    accept: 'form',
    input: z.object({
      id: z.string().trim().min(1, 'Yorum bilgisi eksik.'),
      decision: z.enum(['approve', 'reject']),
      rejection_reason: z.string().trim().optional(),
    }),
    handler: async ({ id, decision, rejection_reason }, context) => {
      if (!context.locals.isAdmin) {
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: 'Admin yetkisi gerekli.',
        });
      }

      try {
        return await moderateReview({
          id,
          decision,
          moderatorId: context.locals.user?.id || null,
          rejectionReason: rejection_reason || null,
        });
      } catch (error) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: safeErrorDetail(error, 'Yorum moderasyonu tamamlanamadı.'),
        });
      }
    },
  }),

  createAdminEvent: defineAction({
    accept: 'form',
    input: z.object({
      title: z.string().trim().min(1, 'Etkinlik adı zorunludur.'),
      description: z.string().trim().min(1, 'Açıklama zorunludur.'),
      location: z.string().trim().min(1, 'Konum zorunludur.'),
      start_date: z.string().trim().min(1, 'Başlangıç tarihi zorunludur.'),
      end_date: z.string().trim().optional(),
      category: z.string().trim().min(1, 'Kategori seçin.'),
      image: z.string().trim().optional(),
      is_featured: z.string().trim().optional(),
      status: z.string().trim().optional(),
    }),
    handler: async (input, context) => {
      if (!context.locals.isAdmin) {
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: 'Admin yetkisi gerekli.',
        });
      }

      try {
        return await createAdminEvent({
          title: input.title,
          description: input.description,
          location: input.location,
          startDate: input.start_date,
          endDate: input.end_date || null,
          category: input.category,
          image: input.image || null,
          isFeatured: input.is_featured || null,
          status: input.status || null,
          userId: context.locals.user?.id || null,
        });
      } catch (error) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: safeErrorDetail(error, 'Etkinlik oluşturulamadı.'),
        });
      }
    },
  }),

  updateAdminEvent: defineAction({
    accept: 'form',
    input: z.object({
      id: z.string().trim().min(1, 'Etkinlik bilgisi eksik.'),
      title: z.string().trim().min(1, 'Etkinlik adı zorunludur.'),
      description: z.string().trim().min(1, 'Açıklama zorunludur.'),
      location: z.string().trim().min(1, 'Konum zorunludur.'),
      start_date: z.string().trim().min(1, 'Başlangıç tarihi zorunludur.'),
      end_date: z.string().trim().optional(),
      category: z.string().trim().min(1, 'Kategori seçin.'),
      image: z.string().trim().optional(),
      is_featured: z.string().trim().optional(),
      status: z.string().trim().optional(),
    }),
    handler: async (input, context) => {
      if (!context.locals.isAdmin) {
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: 'Admin yetkisi gerekli.',
        });
      }

      try {
        return await updateAdminEvent(input.id, {
          title: input.title,
          description: input.description,
          location: input.location,
          startDate: input.start_date,
          endDate: input.end_date || null,
          category: input.category,
          image: input.image || null,
          isFeatured: input.is_featured || null,
          status: input.status || null,
        });
      } catch (error) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: safeErrorDetail(error, 'Etkinlik güncellenemedi.'),
        });
      }
    },
  }),

  deleteAdminEvent: defineAction({
    accept: 'form',
    input: z.object({
      id: z.string().trim().min(1, 'Etkinlik bilgisi eksik.'),
    }),
    handler: async ({ id }, context) => {
      if (!context.locals.isAdmin) {
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: 'Admin yetkisi gerekli.',
        });
      }

      try {
        return await deleteAdminEvent(id);
      } catch (error) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: safeErrorDetail(error, 'Etkinlik silinemedi.'),
        });
      }
    },
  }),

  createAdminHistoricalSite: defineAction({
    accept: 'form',
    input: z.object({
      name: z.string().trim().min(1, 'Yer adı zorunludur.'),
      description: z.string().trim().min(1, 'Açıklama zorunludur.'),
      short_description: z.string().trim().optional(),
      location: z.string().trim().min(1, 'Adres zorunludur.'),
      period: z.string().trim().optional(),
      entry_fee: z.string().trim().optional(),
      opening_hours: z.string().trim().optional(),
      latitude: z.string().trim().optional(),
      longitude: z.string().trim().optional(),
      images: z.string().trim().optional(),
      is_unesco: z.string().trim().optional(),
      is_featured: z.string().trim().optional(),
      status: z.string().trim().optional(),
    }),
    handler: async (input, context) => {
      if (!context.locals.isAdmin) {
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: 'Admin yetkisi gerekli.',
        });
      }

      try {
        return await createAdminHistoricalSite({
          name: input.name,
          description: input.description,
          shortDescription: input.short_description || null,
          location: input.location,
          period: input.period || null,
          entryFee: input.entry_fee || null,
          openingHours: input.opening_hours || null,
          latitude: input.latitude || null,
          longitude: input.longitude || null,
          images: input.images || null,
          isUnesco: input.is_unesco || null,
          isFeatured: input.is_featured || null,
          status: input.status || null,
        });
      } catch (error) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: safeErrorDetail(error, 'Tarihi yer oluşturulamadı.'),
        });
      }
    },
  }),

  updateAdminHistoricalSite: defineAction({
    accept: 'form',
    input: z.object({
      id: z.string().trim().min(1, 'Tarihi yer bilgisi eksik.'),
      name: z.string().trim().min(1, 'Yer adı zorunludur.'),
      description: z.string().trim().min(1, 'Açıklama zorunludur.'),
      short_description: z.string().trim().optional(),
      location: z.string().trim().min(1, 'Adres zorunludur.'),
      period: z.string().trim().optional(),
      entry_fee: z.string().trim().optional(),
      opening_hours: z.string().trim().optional(),
      latitude: z.string().trim().optional(),
      longitude: z.string().trim().optional(),
      images: z.string().trim().optional(),
      is_unesco: z.string().trim().optional(),
      is_featured: z.string().trim().optional(),
      status: z.string().trim().optional(),
    }),
    handler: async (input, context) => {
      if (!context.locals.isAdmin) {
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: 'Admin yetkisi gerekli.',
        });
      }

      try {
        return await updateAdminHistoricalSite(input.id, {
          name: input.name,
          description: input.description,
          shortDescription: input.short_description || null,
          location: input.location,
          period: input.period || null,
          entryFee: input.entry_fee || null,
          openingHours: input.opening_hours || null,
          latitude: input.latitude || null,
          longitude: input.longitude || null,
          images: input.images || null,
          isUnesco: input.is_unesco || null,
          isFeatured: input.is_featured || null,
          status: input.status || null,
        });
      } catch (error) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: safeErrorDetail(error, 'Tarihi yer güncellenemedi.'),
        });
      }
    },
  }),

  deleteAdminHistoricalSite: defineAction({
    accept: 'form',
    input: z.object({
      id: z.string().trim().min(1, 'Tarihi yer bilgisi eksik.'),
    }),
    handler: async ({ id }, context) => {
      if (!context.locals.isAdmin) {
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: 'Admin yetkisi gerekli.',
        });
      }

      try {
        return await deleteAdminHistoricalSite(id);
      } catch (error) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: safeErrorDetail(error, 'Tarihi yer silinemedi.'),
        });
      }
    },
  }),
};
