/// <reference types="astro/client" />

interface ImportMetaEnv {
  [key: string]: string | undefined;
  readonly DATABASE_URL?: string;
  readonly JWT_SECRET?: string;
  readonly SESSION_SECRET?: string;
  readonly REDIS_URL?: string;
  readonly REDIS_KEY_PREFIX?: string;
  readonly CORS_ORIGINS?: string;
  readonly EMAIL_FROM?: string;
  readonly SITE_URL?: string;
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_SUPABASE_URL?: string;
  readonly PUBLIC_SUPABASE_ANON_KEY?: string;
  readonly PUBLIC_GA_MEASUREMENT_ID?: string;
  readonly PUBLIC_ADSENSE_CLIENT?: string;
  readonly PUBLIC_ADSENSE_SLOT_HOMEPAGE_BANNER?: string;
  readonly PUBLIC_ADSENSE_SLOT_BLOG_LIST_SIDEBAR?: string;
  readonly PUBLIC_ADSENSE_SLOT_BLOG_DETAIL_INLINE?: string;
  readonly PUBLIC_ADSENSE_SLOT_BLOG_DETAIL_SIDEBAR?: string;
  readonly PUBLIC_ADSENSE_SLOT_CLASSIFIED_DETAIL?: string;
  readonly GOOGLE_ANALYTICS_ID?: string;
  readonly PUBLIC_VAPID_PUBLIC_KEY?: string;
  readonly PUBLIC_APP_URL?: string;
  readonly PUBLIC_APP_VERSION?: string;
  readonly PORT?: string;
  readonly NODE_ENV?: string;
  readonly PROD: boolean;
  readonly DEV: boolean;
  readonly MODE: string;
  readonly BASE_URL: string;
  // SMTP
  readonly SMTP_HOST?: string;
  readonly SMTP_PORT?: string;
  readonly SMTP_SECURE?: string;
  readonly SMTP_USER?: string;
  readonly SMTP_PASS?: string;
  readonly SMTP_FROM?: string;
  readonly SMTP_FROM_NAME?: string;
  // Social
  readonly SOCIAL_OPEN_ACCESS?: string;
  readonly SOCIAL_TINDER_ENABLED?: string;
  readonly SOCIAL_AUTO_CONVERSATION?: string;
  readonly SOCIAL_SWIPE_DAILY_LIMIT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  showConfirm?: (message: string) => Promise<boolean>;
  promptInput?: (message: string, defaultValue?: string) => Promise<string | null>;
}

declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string | undefined;
    readonly DATABASE_URL?: string;
    readonly JWT_SECRET?: string;
    readonly SESSION_SECRET?: string;
    readonly REDIS_URL?: string;
    readonly REDIS_KEY_PREFIX?: string;
    readonly CORS_ORIGINS?: string;
    readonly EMAIL_FROM?: string;
    readonly SITE_URL?: string;
    readonly PUBLIC_SITE_URL?: string;
    readonly PUBLIC_ADSENSE_CLIENT?: string;
    readonly PUBLIC_ADSENSE_SLOT_HOMEPAGE_BANNER?: string;
    readonly PUBLIC_ADSENSE_SLOT_BLOG_LIST_SIDEBAR?: string;
    readonly PUBLIC_ADSENSE_SLOT_BLOG_DETAIL_INLINE?: string;
    readonly PUBLIC_ADSENSE_SLOT_BLOG_DETAIL_SIDEBAR?: string;
    readonly PUBLIC_ADSENSE_SLOT_CLASSIFIED_DETAIL?: string;
    readonly NODE_ENV?: string;
    readonly PORT?: string;
    readonly SMTP_HOST?: string;
    readonly SMTP_PORT?: string;
    readonly SMTP_SECURE?: string;
    readonly SMTP_USER?: string;
    readonly SMTP_PASS?: string;
    readonly SOCIAL_OPEN_ACCESS?: string;
    readonly SOCIAL_TINDER_ENABLED?: string;
    readonly SOCIAL_AUTO_CONVERSATION?: string;
    readonly SOCIAL_SWIPE_DAILY_LIMIT?: string;
  }
}

// App.Locals is declared in src/middleware.ts (declare global > namespace App > interface Locals)
// App.SessionData (Astro session API) is not used in this project — Astro 6 SSR uses JWT + Redis sessions.
