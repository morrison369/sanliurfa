/// <reference types="astro/client" />

interface ImportMetaEnv {
  [key: string]: string | undefined;
  readonly DATABASE_URL?: string;
  readonly JWT_SECRET?: string;
  readonly REDIS_URL?: string;
  readonly REDIS_KEY_PREFIX?: string;
  readonly SITE_URL?: string;
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_SUPABASE_URL?: string;
  readonly PUBLIC_SUPABASE_ANON_KEY?: string;
  readonly PUBLIC_GA_MEASUREMENT_ID?: string;
  readonly GOOGLE_ANALYTICS_ID?: string;
  readonly PUBLIC_VAPID_PUBLIC_KEY?: string;
  readonly PORT?: string;
  readonly NODE_ENV?: string;
  readonly PROD: boolean;
  readonly DEV: boolean;
  readonly MODE: string;
  readonly BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string | undefined;
    readonly DATABASE_URL?: string;
    readonly JWT_SECRET?: string;
    readonly REDIS_URL?: string;
    readonly REDIS_KEY_PREFIX?: string;
    readonly SITE_URL?: string;
    readonly PUBLIC_SITE_URL?: string;
    readonly NODE_ENV?: string;
    readonly PORT?: string;
  }
}

declare namespace App {
  interface SessionData {
    user: {
      id: string;
      email: string;
      role?: string;
    };
    cart: string[];
    flash: {
      type: 'success' | 'error' | 'info';
      message: string;
    };
    lastVisit: Date;
  }
}
