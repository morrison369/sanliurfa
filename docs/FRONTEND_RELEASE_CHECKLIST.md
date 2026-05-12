# Frontend Release Checklist (Prod Öncesi Zorunlu)

## 1) UI/UX ve Tema Tutarlılığı
- Landing ve alt sayfalar aynı component sistemi (`src/components/home`, `src/components/sf`) ile render ediliyor.
- Inline style/inline hover handler drift gate tarafından engelleniyor.
- Şanlıurfa renk tokenları dışında rastgele renk kullanımı yok.
- Canonical tema light Şanlıurfa paletidir; `npm run frontend:theme:gate` dark class/localStorage driftini engeller.

## 2) İçerik ve Görsel Doğruluğu
- İçerik başlıkları ile görseller intent açısından eşleşiyor.
- Alakasız/tekrarlı görsel yok, fallback görseller anlamlı.
- Kritik sayfalarda görsel yükleme hatasında güvenli fallback mevcut.

## 3) Runtime ve SSR Sağlığı
- Kritik route’larda SSR veri hatasında boş ekran yerine fallback state render ediliyor.
- Hata loglarında `route`, `query`, `content-id` veya eşdeğer context var.
- `Internal server error` üreten rotalar release öncesi bloklayıcı.

## 4) SEO/AEO/GEO Standardı
- Title, description, canonical, H1 ve FAQ yapısı helper/şablonla yönetiliyor.
- JSON-LD (WebSite, WebPage, FAQ, Breadcrumb vb.) eksiksiz.
- `/en`, `/tr`, hreflang veya çok dilli yapı yok (TR-only politika).

## 5) PWA Hazırlığı
- Manifest, icon setleri, install UX metinleri hazır.
- Android Chrome ve iOS Safari için “uygulama gibi ekleme” akışı doğrulandı.
- Offline fallback sayfası tanımlı.

## 6) Performans Bütçesi
- LCP, CLS, JS payload ve görsel boyut bütçeleri aşılmıyor.
- Kritik hero görseller preload/fetchpriority stratejisi ile yükleniyor.

## 7) Yayın Kararı
- Playwright kullanmadan `npm run release:astro:gate` geçti.
- Astro dev/preview üzerinden kritik route HTTP smoke 200 döndü.
- Prod deploy tek seferde yapılacak şekilde release paketi hazır.
