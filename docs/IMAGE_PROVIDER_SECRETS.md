# Image Provider Secrets

Şanlıurfa içerik görselleri için Pexels ve Unsplash sağlayıcıları kullanılacak.

## Kesin Kural

- Kullanıcıdan bu keyler tekrar istenmeyecek.
- Gerçek key değerleri tracked dosyalara, dokümana, kaynak koda veya commit geçmişine yazılmayacak.
- Local çalışma için değerler `.env.local` dosyasında tutulur; bu dosya `.gitignore` kapsamındadır.
- Production/CWP ortamında değerler domain kullanıcısının environment/secret ayarlarına girilir.
- Görsel dosya adları içerik slug değerine göre üretilir.

## Environment Değişkenleri

```env
PEXELS_API_KEY=your_pexels_api_key
UNSPLASH_APPLICATION_ID=your_unsplash_application_id
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
UNSPLASH_SECRET_KEY=your_unsplash_secret_key
```

## Kullanım Notu

Astro SSR ve API route kodları bu değerleri server tarafında `process.env` üzerinden okumalıdır. Client bundle içine secret değerleri aktarılmayacak.
