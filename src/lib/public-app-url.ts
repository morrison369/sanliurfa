export function getPublicAppUrl(): string {
  return (
    process.env.PUBLIC_APP_URL ||
    process.env.SITE_URL ||
    process.env.PUBLIC_SITE_URL ||
    'https://sanliurfa.com'
  ).replace(/\/$/, '');
}

