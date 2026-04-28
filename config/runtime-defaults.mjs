export const runtimeDefaults = {
  appPort: Number(process.env.APP_PORT || process.env.PORT || 4321),
  previewPort: Number(process.env.PREVIEW_PORT || process.env.PORT || 3000),
  dbPort: Number(process.env.DB_PORT || 5432),
  redisPort: Number(process.env.REDIS_PORT || 6379),
  host: process.env.HOST || '127.0.0.1',
};
