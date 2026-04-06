import type { APIRoute } from 'astro';

// TODO: Facebook OAuth implementasyonu
// Facebook OAuth için app ID ve secret gerekli
// Bu dosya şimdilik placeholder olarak bırakılmıştır

export const GET: APIRoute = async ({ url }) => {
  try {
    // Facebook OAuth entegrasyonu henüz yapılmamış
    // Facebook Developer Console'dan app ID ve secret alınmalı
    
    console.log('Facebook OAuth requested but not configured');
    
    return new Response(JSON.stringify({ 
      error: 'Facebook OAuth not configured. Please set up FACEBOOK_APP_ID and FACEBOOK_APP_SECRET.' 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
