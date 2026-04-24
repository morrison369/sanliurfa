import type { APIRoute } from 'astro';
import {
  logPasswordResetError,
  requestPasswordReset,
} from '../../../lib/auth/password-reset';
import { getCache, setCache } from '../../../lib/cache';

const RESET_LIMIT = 5;
const RESET_WINDOW = 3600; // 1 saat

function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',').map((s: string) => s.trim()).at(-1) || 'unknown';
  return request.headers.get('x-real-ip') || 'unknown';
}

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const ip = getClientIP(request);
    const ipKey = `forgot:ip:${ip}`;
    const ipCount = Number(await getCache(ipKey).catch(() => null)) || 0;
    if (ipCount >= RESET_LIMIT) {
      return redirect('/sifremi-unuttum?success=email_sent');
    }

    const formData = await request.formData();
    const email = formData.get('email')?.toString() || '';

    if (!email) {
      return redirect('/sifremi-unuttum?error=missing_email');
    }

    const emailKey = `forgot:email:${email.toLowerCase()}`;
    const emailCount = Number(await getCache(emailKey).catch(() => null)) || 0;
    if (emailCount >= 3) {
      // Silently succeed to prevent timing-based email enumeration
      return redirect('/sifremi-unuttum?success=email_sent');
    }

    await Promise.all([
      setCache(ipKey, ipCount + 1, RESET_WINDOW).catch(() => null),
      setCache(emailKey, emailCount + 1, RESET_WINDOW).catch(() => null),
    ]);

    await requestPasswordReset(email, new URL(request.url).origin);

    return redirect('/sifremi-unuttum?success=email_sent');
  } catch (err) {
    logPasswordResetError('Forgot password error', err);
    return redirect('/sifremi-unuttum?error=server_error');
  }
};
