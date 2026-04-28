# Proje Lokal Redis - Astro SSR

Bu proje Redis'i global Windows servisinden bağımsız çalıştırır. Amaç, başka projelerin Redis süreçleri ve portlarıyla çakışmadan Astro SSR cache, session ve rate-limit katmanını çalıştırmaktır.

## Sabitler

- Astro dev portu: `4321`
- PostgreSQL portu: `5432`
- Ana çalışma ağacı Redis portu: `6381`
- `public-worktree-sync` Redis portu: `6382`
- Redis data/log/pid klasörü: `.runtime/redis`
- Redis env URL ana repo için: `REDIS_URL=redis://:<password>@127.0.0.1:6381`
- Redis env URL public worktree için: `REDIS_URL=redis://:<password>@127.0.0.1:6382`
- Redis key prefix: `sanliurfa:`

## Komutlar

```bash
npm run redis:isolated:ensure
npm run redis:isolated:status
npm run redis:isolated:health
npm run redis:isolated:stop
npm run dev:isolated:stop:all
```

`redis:isolated:*` komutları `.env` dosyasını okur, `.runtime/redis/redis.conf` dosyasını runtime sırasında üretir ve sadece bu proje config'iyle çalışan Redis process'ini yönetir.

Astro geliştirme sunucusu başlatılırken Redis artık otomatik preflight olarak hazırlanır:

```bash
npm run dev:isolated:ensure
npm run dev:isolated:start
npm run dev:isolated:restart
```

Bu komutlar önce `redis:isolated:ensure`, sonra port izolasyon preflight'ı, ardından Astro dev daemon işlemini çalıştırır.

## Kurallar

- Bu proje için global `6379` Redis portu kullanılmaz.
- Aynı makinede ana repo ve public worktree birlikte çalışacaksa varsayılan portlar ayrıdır: ana repo `6381`, public worktree `6382`.
- `.runtime/redis` git'e girmez; veri, pid, log ve üretilen config lokal kalır.
- Astro SSR içinde Redis bağlantısı ilk cache/session/rate-limit çağrısında lazy olarak açılır.
- Redis yoksa uygulama fail-open davranır, fakat lokal geliştirmede `dev:isolated:*` komutları Redis'i otomatik hazırlar.
- Başka projelerin Redis servisleri durdurulmaz veya yeniden yapılandırılmaz.
- `dev:isolated:stop` sadece Astro dev server'ı kapatır; proje Redis servisini kapatmak için ayrıca `redis:isolated:stop` kullanılır.
- `dev:isolated:stop:all` Astro dev server'ı kapatır, orphan kontrolü yapar ve sadece bu projenin Redis instance'ını durdurur.
- Redis pid dosyası kaybolursa `redis:isolated:status` ve `redis:isolated:stop`, hedef port listener command-line bilgisinden sadece `.runtime/redis/redis.conf` ile çalışan bu proje Redis process'ini bulur.

## Doğrulama

```bash
npm run redis:isolated:health
npm run dev:isolated:ensure
curl http://localhost:4321/api/health
npm run dev:isolated:stop
npm run redis:isolated:stop
npm run dev:isolated:stop:all
```

`api/health` isteğinde Redis kaynaklı `unavailable` veya rate-limit fail-open uyarısı görülmemelidir.
