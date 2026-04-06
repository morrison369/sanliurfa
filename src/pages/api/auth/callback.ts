// API: OAuth callback - PostgreSQL versiyonu
// NOT: OAuth entegrasyonu için Google/Facebook API key'leri gereklidir
import type { APIRoute } from 'astro';
import { queryOne, insert } from '../../../lib/postgres';
import { createToken } from '../../../lib/auth';

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');
  const provider = url.searchParams.get('provider') || 'google';

  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return redirect(`/giris?error=${encodeURIComponent(errorDescription || error)}`);
  }

  if (!code) {
    return redirect('/giris?error=no_code');
  }

  try {
    // TODO: OAuth token exchange implementasyonu
    // Şimdilik basit bir mock - gerçek implementasyonda:
    // 1. code ile access_token al
    // 2. access_token ile user bilgilerini çek
    // 3. DB'de kullanıcı varsa login yap, yoksa oluştur
    
    console.log(`OAuth callback received for ${provider} with code: ${code.substring(0, 10)}...`);
    
    // OAuth implementasyonu tamamlanana kadar hata dön
    return redirect('/giris?error=oauth_not_configured');
    
  } catch (error: any) {
    console.error('Auth callback error:', error);
    return redirect(`/giris?error=${encodeURIComponent(error.message)}`);
  }
};
