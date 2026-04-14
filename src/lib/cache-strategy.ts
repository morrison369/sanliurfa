/**
 * Önbellekleme Stratejisi Yardımcıları
 *
 * Hafıza içi önbellek, stale-while-revalidate deseni,
 * önbellek geçersiz kılma ve istatistik raporlama içerir.
 */

// ============================================================
// Önbellek Girişi Arayüzü
// ============================================================

interface CacheEntry<T = unknown> {
  /** Önbellekteki veri */
  data: T;
  /** Oluşturulma zamanı (timestamp) */
  createdAt: number;
  /** Son erişim zamanı (timestamp) */
  lastAccessedAt: number;
  /** TTL (Time To Live) milisaniye cinsinden */
  ttl: number;
  /** Stale süresi (TTL sonrası stale-while-revalidate penceresi) */
  staleTtl: number;
  /** Stale olup olmadığını bayrağı */
  isStale: boolean;
}

/**
 * Önbellek istatistikleri
 */
export interface CacheStats {
  /** Toplam giriş sayısı */
  totalEntries: number;
  /** Geçerli giriş sayısı */
  validEntries: number;
  /** Süresi dolmuş giriş sayısı */
  expiredEntries: number;
  /** Stale giriş sayısı */
  staleEntries: number;
  /** Toplam isabet sayısı */
  totalHits: number;
  /** Toplam ıskalama sayısı */
  totalMisses: number;
  /** İsabet oranı (0-1 arası) */
  hitRate: number;
  /** Mevcut bellek kullanımı (yaklaşık bayt) */
  memoryUsage: number;
  /** Maksimum bellek sınırı (bayt) */
  maxMemory: number;
}

// ============================================================
// Hafıza İçi Önbellek Sınıfı
// ============================================================

/**
 * TTL (Time To Live) destekli hafıza içi önbellek.
 *
 * - Otomatik süre dolması kontrolü
 * - Stale-while-revalidate desteği
 * - Maksimum bellek sınırı
 * - LRU (Least Recently Used) temizleme
 * - İstatistik takibi
 *
 * @example
 * const cache = new InMemoryCache<string>({
 *   maxMemory: 50 * 1024 * 1024, // 50MB
 *   defaultTTL: 300_000,          // 5 dakika
 *   defaultStaleTTL: 60_000,      // 1 dakika stale pencere
 * });
 *
 * cache.set('places:list', placesData);
 * const data = cache.get('places:list');
 */
export class InMemoryCache<T = unknown> {
  /** Önbellek deposu */
  private store: Map<string, CacheEntry<T>> = new Map();

  /** Varsayılan TTL (milisaniye) */
  private defaultTTL: number;

  /** Varsayılan stale TTL (milisaniye) */
  private defaultStaleTTL: number;

  /** Maksimum bellek kullanımı (bayt) */
  private maxMemory: number;

  /** İstatistikler */
  private stats: { hits: number; misses: number } = { hits: 0, misses: 0 };

  /** Tahmini bellek kullanımı (bayt) */
  private currentMemoryUsage: number = 0;

  constructor(options?: {
    /** Varsayılan TTL milisaniye cinsinden (varsayılan: 5 dakika) */
    defaultTTL?: number;
    /** Stale pencere süresi milisaniye cinsinden (varsayılan: 1 dakika) */
    defaultStaleTTL?: number;
    /** Maksimum bellek bayt cinsinden (varsayılan: 100MB) */
    maxMemory?: number;
  }) {
    this.defaultTTL = options?.defaultTTL ?? 5 * 60 * 1000; // 5 dakika
    this.defaultStaleTTL = options?.defaultStaleTTL ?? 60 * 1000; // 1 dakika
    this.maxMemory = options?.maxMemory ?? 100 * 1024 * 1024; // 100MB
  }

  // -----------------------------------------------------------
  // Temel İşlemler
  // -----------------------------------------------------------

  /**
   * Önbelleğe veri ekler.
   *
   * @param key - Önbellek anahtarı
   * @param data - Saklanacak veri
   * @param ttl - Milisaniye cinsinden geçerlilik süresi (varsayılan: defaultTTL)
   * @param staleTtl - Stale pencere süresi (varsayılan: defaultStaleTTL)
   */
  set(
    key: string,
    data: T,
    ttl?: number,
    staleTtl?: number
  ): void {
    const actualTTL = ttl ?? this.defaultTTL;
    const actualStaleTTL = staleTtl ?? this.defaultStaleTTL;
    const now = Date.now();

    // Bellek sınırını kontrol et
    const estimatedSize = this.estimateSize(data);
    this.evictIfNeeded(estimatedSize);

    const entry: CacheEntry<T> = {
      data,
      createdAt: now,
      lastAccessedAt: now,
      ttl: actualTTL,
      staleTtl: actualStaleTTL,
      isStale: false,
    };

    this.store.set(key, entry);
    this.currentMemoryUsage += estimatedSize;
  }

  /**
   * Önbellekten veri alır.
   *
   * Stale-while-revalidate mantığı:
   * - TTL içindese: doğrudan döner
   * - TTL geçmiş ama stale içindeyse: stale veriyi döner (isStale: true ile)
   * - İkisi de geçmişse: null döner
   *
   * @param key - Önbellek anahtarı
   * @returns { data, isStale } veya null
   */
  get(key: string): { data: T; isStale: boolean } | null {
    const entry = this.store.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();
    const age = now - entry.createdAt;

    // TTL içinde - taze veri
    if (age < entry.ttl) {
      entry.lastAccessedAt = now;
      entry.isStale = false;
      this.stats.hits++;
      return { data: entry.data, isStale: false };
    }

    // Stale penceresinde - stale veri döner ama arka planda yenileme önerilir
    if (age < entry.ttl + entry.staleTtl) {
      entry.lastAccessedAt = now;
      entry.isStale = true;
      this.stats.hits++;
      return { data: entry.data, isStale: true };
    }

    // Süresi tamamen dolmuş - temizle
    this.delete(key);
    this.stats.misses++;
    return null;
  }

  /**
   * Önbellekten girişi siler.
   *
   * @param key - Silinecek anahtar
   * @returns Silindiyse true, yoksa false
   */
  delete(key: string): boolean {
    const entry = this.store.get(key);
    if (entry) {
      this.currentMemoryUsage -= this.estimateSize(entry.data);
      return this.store.delete(key);
    }
    return false;
  }

  /**
   * Önbellekte anahtarın olup olmadığını kontrol eder.
   * (Süresi dolmuşsa false döner)
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  // -----------------------------------------------------------
  // Toplu İşlemler
  // -----------------------------------------------------------

  /**
   * Birden fazla önbellek anahtarını temizler.
   * Prefix ile eşleşen tüm anahtarları siler.
   *
   * @param prefix - Anahtar ön eki (örn: 'places:')
   * @returns Silinen anahtar sayısı
   *
   * @example
   * // Tüm 'places:' ile başlayan önbellekleri temizle
   * cache.invalidateByPrefix('places:');
   */
  invalidateByPrefix(prefix: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Birden fazla girişi toplu siler.
   */
  invalidateMany(keys: string[]): number {
    let count = 0;
    for (const key of keys) {
      if (this.delete(key)) count++;
    }
    return count;
  }

  /**
   * Tüm önbelleği temizler.
   */
  clear(): void {
    this.store.clear();
    this.currentMemoryUsage = 0;
  }

  // -----------------------------------------------------------
  // Bakım ve Temizleme
  // -----------------------------------------------------------

  /**
   * Süresi dolmuş tüm girişleri temizler.
   * Periodik olarak çağrılması önerilir.
   *
   * @returns Temizlenen giriş sayısı
   */
  prune(): number {
    let count = 0;
    const now = Date.now();

    for (const [key, entry] of this.store.entries()) {
      const age = now - entry.createdAt;
      if (age >= entry.ttl + entry.staleTtl) {
        this.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * En eski erişilen girişleri silerek bellek açar.
   * LRU (Least Recently Used) stratejisi kullanır.
   *
   * @param bytesNeeded - İhtiyaç duyulan bayt miktarı
   */
  private evictIfNeeded(bytesNeeded: number): void {
    if (this.currentMemoryUsage + bytesNeeded <= this.maxMemory) {
      return;
    }

    // En az kullanılanları bul ve sil
    const sorted = Array.from(this.store.entries()).sort(
      (a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt
    );

    let freed = 0;
    const target = this.currentMemoryUsage + bytesNeeded - this.maxMemory;

    for (const [key, entry] of sorted) {
      if (freed >= target) break;

      const size = this.estimateSize(entry.data);
      this.store.delete(key);
      freed += size;
      this.currentMemoryUsage -= size;
    }
  }

  // -----------------------------------------------------------
  // İstatistikler
  // -----------------------------------------------------------

  /**
   * Önbellek istatistiklerini döner.
   */
  getStats(): CacheStats {
    const now = Date.now();
    let valid = 0;
    let expired = 0;
    let stale = 0;

    for (const entry of this.store.values()) {
      const age = now - entry.createdAt;
      if (age >= entry.ttl + entry.staleTtl) {
        expired++;
      } else if (age >= entry.ttl) {
        stale++;
      } else {
        valid++;
      }
    }

    const totalRequests = this.stats.hits + this.stats.misses;

    return {
      totalEntries: this.store.size,
      validEntries: valid,
      expiredEntries: expired,
      staleEntries: stale,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      memoryUsage: this.currentMemoryUsage,
      maxMemory: this.maxMemory,
    };
  }

  /**
   * İstatistikleri sıfırlar.
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0 };
  }

  // -----------------------------------------------------------
  // Yardımcı Fonksiyonlar
  // -----------------------------------------------------------

  /**
   * Verinin tahmini bayt boyutunu hesaplar.
   * JSON stringleştirme ile yaklaşık boyut belirler.
   */
  private estimateSize(data: unknown): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 1024; // Tahmini 1KB
    }
  }

  /**
   * Önbellekteki tüm anahtarları döner.
   */
  keys(): string[] {
    return Array.from(this.store.keys());
  }

  /**
   * Önbellek boyutunu (giriş sayısı) döner.
   */
  get size(): number {
    return this.store.size;
  }
}

// ============================================================
// Stale-While-Revalidate Yardımcısı
// ============================================================

/**
 * Stale-while-revalidate deseni uygulayan yüksek seviye fonksiyon.
 *
 * İş akışı:
 * 1. Önbellekten kontrol et
 * 2. Taze ise doğrudan döner
 * 3. Stale ise stale veriyi döner VE arka planda yeniler
 * 4. Yoksa fetch fonksiyonunu çağırır ve önbelleğe alır
 *
 * @param key - Önbellek anahtarı
 * @param cache - InMemoryCache örneği
 * @param fetchFn - Veriyi alacak asenkron fonksiyon
 * @param options - Yapılandırma
 * @returns Önbellekteki veya fetch'ten alınan veri
 *
 * @example
 * const data = await staleWhileRevalidate(
 *   'places:featured',
 *   cache,
 *   () => fetchFeaturedPlaces(),
 *   { ttl: 60_000, staleTtl: 30_000 }
 * );
 */
export async function staleWhileRevalidate<T>(
  key: string,
  cache: InMemoryCache<T>,
  fetchFn: () => Promise<T>,
  options?: {
    ttl?: number;
    staleTtl?: number;
    /** Stale veri döndüğünde arka planda yenileme yap (varsayılan: true) */
    revalidateInBackground?: boolean;
  }
): Promise<T> {
  const cached = cache.get(key);

  // Taze önbellek varsa doğrudan döner
  if (cached && !cached.isStale) {
    return cached.data;
  }

  // Stale önbellek varsa döner ama arka planda yeniler
  if (cached && cached.isStale) {
    const shouldRevalidate = options?.revalidateInBackground ?? true;

    if (shouldRevalidate) {
      // Arka planda yenile - promise'i beklemeden devam et
      fetchFn()
        .then((freshData) => {
          cache.set(key, freshData, options?.ttl, options?.staleTtl);
        })
        .catch((err) => {
          console.error(`[Önbellek Yenileme Hatası] ${key}:`, err);
        });
    }

    return cached.data;
  }

  // Önbellekte yoksa fetch et ve önbelleğe al
  const freshData = await fetchFn();
  cache.set(key, freshData, options?.ttl, options?.staleTtl);
  return freshData;
}

// ============================================================
// Varsayılan Önbellek Örneği
// ============================================================

/**
 * Paylaşılan genel önbellek örneği.
 * Modüller arasında aynı önbelleği kullanmak için bu örneği import edin.
 *
 * @example
 * import { sharedCache } from './cache-strategy';
 *
 * sharedCache.set('user:123', userData, 10 * 60 * 1000); // 10 dakika
 * const user = sharedCache.get('user:123');
 */
export const sharedCache = new InMemoryCache({
  defaultTTL: 5 * 60 * 1000,       // 5 dakika
  defaultStaleTTL: 60 * 1000,      // 1 dakika stale pencere
  maxMemory: 50 * 1024 * 1024,     // 50MB
});

// ============================================================
// Önbellek Anahtarı Üreticiler
// ============================================================

/**
 * Mekan verileri için önbellek anahtarı üretir.
 */
export function placeCacheKey(id: string | number, suffix?: string): string {
  return suffix ? `places:${id}:${suffix}` : `places:${id}`;
}

/**
 * Kullanıcı verileri için önbellek anahtarı üretir.
 */
export function userCacheKey(id: string | number, suffix?: string): string {
  return suffix ? `users:${id}:${suffix}` : `users:${id}`;
}

/**
 * Blog verileri için önbellek anahtarı üretir.
 */
export function blogCacheKey(id: string | number, suffix?: string): string {
  return suffix ? `blog:${id}:${suffix}` : `blog:${id}`;
}

/**
 * Liste sorguları için önbellek anahtarı üretir.
 * Filtre parametrelerini hash'leyerek benzersiz anahtar oluşturur.
 */
export function listCacheKey(
  entity: string,
  params: Record<string, unknown>
): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return `${entity}:list:${sorted}`;
}
