// Type declarations for environment variables

interface ImportMetaEnv {
  [key: string]: string | undefined;
  readonly DATABASE_URL?: string;
  readonly JWT_SECRET?: string;
  readonly REDIS_URL?: string;
  readonly REDIS_KEY_PREFIX?: string;
  readonly PUBLIC_SUPABASE_URL?: string;
  readonly PUBLIC_SUPABASE_ANON_KEY?: string;
  readonly PUBLIC_SITE_URL?: string;
  readonly MODE?: string;
  readonly DEV?: boolean;
  readonly PROD?: boolean;
  readonly PORT?: string;
  readonly NODE_ENV?: string;
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
    readonly NODE_ENV?: string;
    readonly PORT?: string;
  }
}
