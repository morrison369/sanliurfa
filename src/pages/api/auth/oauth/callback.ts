/**
 * OAuth callback endpointi
 * OAuth sağlayıcı dönüşünü işler.
 */

import type { APIRoute } from "astro";
import {
  verifyOAuthState,
  getOAuthProvider,
  linkOAuthAccount,
  getOAuthAccountByProvider,
} from "../../../../lib/oauth";
import { createUserSession } from "../../../../lib/security";
import { queryOne } from "../../../../lib/postgres";
import {
  apiError,
  apiResponse,
  HttpStatus,
  ErrorCode,
  getRequestId,
} from "../../../../lib/api";
import { logger } from "../../../../lib/logging";

export const GET: APIRoute = async ({ request, url }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      logger.warn("OAuth hatası", {
        error,
        error_description: url.searchParams.get("error_description"),
      });
      return apiError(
        ErrorCode.AUTH_ERROR,
        `OAuth hatası: ${error}`,
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId,
      );
    }

    if (!code || !state) {
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        "Kod ve state zorunludur",
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId,
      );
    }

    const oauthState = await verifyOAuthState(state);
    if (!oauthState) {
      return apiError(
        ErrorCode.AUTH_ERROR,
        "Geçersiz veya süresi dolmuş state",
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId,
      );
    }

    const provider = await getOAuthProvider(oauthState.provider_key);
    if (!provider) {
      return apiError(
        ErrorCode.NOT_FOUND,
        "OAuth sağlayıcısı bulunamadı",
        HttpStatus.NOT_FOUND,
        undefined,
        requestId,
      );
    }

    const tokenData = await exchangeCodeForToken(
      provider,
      code,
      oauthState.redirect_uri,
    );
    if (!tokenData) {
      return apiError(
        ErrorCode.AUTH_ERROR,
        "Kod token ile değiştirilemedi",
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId,
      );
    }

    const userInfo = await getUserInfoFromProvider(
      provider,
      tokenData.access_token,
    );
    if (!userInfo) {
      return apiError(
        ErrorCode.AUTH_ERROR,
        "Kullanıcı bilgisi alınamadı",
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId,
      );
    }

    let oauthAccount = await getOAuthAccountByProvider(
      oauthState.provider_key,
      userInfo.id,
    );

    let userId = oauthAccount?.user_id;

    if (!userId) {
      const existingUser = await queryOne(
        "SELECT id FROM users WHERE email = $1",
        [userInfo.email],
      );

      if (existingUser) {
        userId = existingUser.id;
      } else {
        return apiError(
          ErrorCode.AUTH_ERROR,
          "Kullanıcı bulunamadı. Önce kayıt olun.",
          HttpStatus.NOT_FOUND,
          undefined,
          requestId,
        );
      }
    }

    if (!oauthAccount) {
      await linkOAuthAccount(userId, oauthState.provider_key, {
        provider_user_id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        avatar_url: userInfo.picture,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: tokenData.expires_at,
      });
    }

    const ipAddress = (request.headers.get("x-forwarded-for") || "127.0.0.1")
      .split(",")[0]
      .trim();
    const userAgent = request.headers.get("user-agent") || "";

    const session = await createUserSession(
      userId,
      "OAuth Login",
      "web",
      extractBrowser(userAgent),
      extractOS(userAgent),
      ipAddress,
      "unknown", // TODO: Get location from IP
      false,
    );

    if (!session) {
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        "Oturum oluşturulamadı",
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId,
      );
    }

    logger.info("OAuth girişi başarılı", {
      userId,
      provider: oauthState.provider_key,
    });

    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
        "Set-Cookie": `auth-token=${session.session_token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`,
        "X-Request-ID": requestId,
      },
    });
  } catch (error) {
    logger.error(
      "OAuth callback başarısız",
      error instanceof Error ? error : new Error(String(error)),
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      "OAuth callback başarısız",
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId,
    );
  }
};

async function exchangeCodeForToken(
  provider: any,
  code: string,
  redirectUri: string,
): Promise<any> {
  try {
    const response = await fetch(provider.token_url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code,
        client_id: provider.client_id,
        client_secret: provider.client_secret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: new Date(Date.now() + data.expires_in * 1000),
    };
  } catch (error) {
    logger.error(
      "Kod değişimi başarısız",
      error instanceof Error ? error : new Error(String(error)),
    );
    return null;
  }
}

async function getUserInfoFromProvider(
  provider: any,
  accessToken: string,
): Promise<any> {
  try {
    const response = await fetch(provider.userinfo_url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await response.json();

    return {
      id: data.sub || data.id,
      email: data.email,
      name: data.name,
      picture: data.picture,
    };
  } catch (error) {
    logger.error(
      "Kullanıcı bilgisi alınamadı",
      error instanceof Error ? error : new Error(String(error)),
    );
    return null;
  }
}

function extractBrowser(userAgent: string): string {
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Safari")) return "Safari";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Edge")) return "Edge";
  return "Unknown";
}

function extractOS(userAgent: string): string {
  if (userAgent.includes("Windows")) return "Windows";
  if (userAgent.includes("Mac")) return "macOS";
  if (userAgent.includes("Linux")) return "Linux";
  if (userAgent.includes("Android")) return "Android";
  if (userAgent.includes("iOS") || userAgent.includes("iPhone")) return "iOS";
  return "Unknown";
}
