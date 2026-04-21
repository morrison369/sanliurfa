import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  try {
    return new Response(
      JSON.stringify({
        error: "Facebook ile giriş şu anda kapalı.",
      }),
      {
        status: 404,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      },
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
};
