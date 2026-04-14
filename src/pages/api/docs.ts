import type { APIRoute } from 'astro';

const apiDocs = {
  name: 'Sanliurfa.com API',
  version: '1.0.0',
  description: 'Sehir rehberi platformu API dokumantasyonu',
  baseUrl: '/api',
  endpoints: {
    auth: {
      'POST /auth/register': { description: 'Yeni kullanici kaydi', body: ['name', 'email', 'password'] },
      'POST /auth/login': { description: 'Kullanici girisi', body: ['email', 'password'] }
    },
    places: {
      'GET /places': { description: 'Mekan listesi', params: ['category', 'page', 'limit', 'sort'] },
      'GET /places/:id': { description: 'Mekan detayi' },
      'POST /places/:id/reviews': { description: 'Yorum ekle', auth: true },
      'POST /places/apply': { description: 'Isletme basvurusu', body: ['name', 'category', 'address', 'phone', 'ownerName', 'ownerEmail'] }
    },
    search: {
      'GET /search': { description: 'Arama', params: ['q', 'category', 'type'] }
    },
    user: {
      'GET /user/favorites': { description: 'Favori mekanlar', auth: true },
      'POST /user/favorites': { description: 'Favorilere ekle', auth: true },
      'DELETE /user/favorites': { description: 'Favorilerden cikar', auth: true }
    },
    upload: {
      'POST /upload': { description: 'Dosya yukle', auth: true, contentType: 'multipart/form-data' }
    },
    reservations: {
      'GET /reservations': { description: 'Rezervasyon listesi', auth: true },
      'POST /reservations': { description: 'Rezervasyon olustur', body: ['placeId', 'customerName', 'customerPhone', 'reservationDate', 'reservationTime', 'partySize'] }
    },
    promotions: {
      'GET /promotions': { description: 'Kampanya listesi' },
      'POST /promotions': { description: 'Kampanya olustur', auth: true }
    },
    contact: {
      'POST /contact': { description: 'Iletisim formu', body: ['name', 'email', 'subject', 'message', 'type'] }
    },
    admin: {
      'GET /admin/dashboard': { description: 'Admin istatistikleri', auth: true, role: 'admin' },
      'GET /admin/users': { description: 'Kullanici listesi', auth: true, role: 'admin' },
      'GET /admin/places': { description: 'Isletme listesi', auth: true, role: 'admin' }
    }
  },
  authentication: {
    type: 'Bearer Token',
    header: 'Authorization: Bearer <token>'
  },
  rateLimit: {
    default: '100 istek / 15 dakika',
    auth: '1000 istek / 15 dakika',
    endpoints: {
      '/api/auth/login': '5 istek / saat',
      '/api/auth/register': '3 istek / saat'
    }
  }
};

export const GET: APIRoute = () => {
  return new Response(JSON.stringify(apiDocs, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};
