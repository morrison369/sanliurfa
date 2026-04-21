// API: OAuth callback - sosyal giriş kapalı mod
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ url, redirect }) => {
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    console.error("OAuth error:", error, errorDescription);
    return redirect(
      `/giris?error=${encodeURIComponent(errorDescription || error)}`,
    );
  }

  if (!code) {
    return redirect("/giris?error=no_code");
  }

  try {
    return redirect("/giris?error=sosyal_giris_kapali");
  } catch (error: any) {
    console.error("Auth callback error:", error);
    return redirect(`/giris?error=${encodeURIComponent(error.message)}`);
  }
};
