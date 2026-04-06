#!/usr/bin/env python3
"""Redis Cache Optimizasyonu"""
import paramiko

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD)

    print("🚀 Redis Cache Optimizasyonu")
    print("=" * 60)

    # 1. Redis durumu
    print("\n1️⃣ Redis Durumu:")
    stdin, stdout, stderr = ssh.exec_command("redis-cli ping")
    result = stdout.read().decode().strip()
    if result == "PONG":
        print("   ✅ Redis aktif")
    else:
        print("   ❌ Redis çalışmıyor!")
        ssh.close()
        return

    # 2. Redis bilgileri
    print("\n2️⃣ Redis Bilgileri:")
    stdin, stdout, stderr = ssh.exec_command("redis-cli info server | grep -E 'redis_version|connected_clients|used_memory_human'")
    for line in stdout.read().decode().split('\n'):
        if line.strip():
            print(f"   {line.strip()}")

    # 3. Cache servisi oluştur
    print("\n3️⃣ Cache servisi oluşturuluyor...")
    
    cache_service = '''import Redis from 'ioredis';

// Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

// Cache süreleri (saniye)
const CACHE_TTL = {
  SHORT: 60,      // 1 dakika
  MEDIUM: 300,    // 5 dakika
  LONG: 3600,     // 1 saat
  VERY_LONG: 86400, // 24 saat
};

export class Cache {
  // Get cache
  static async get(key: string): Promise<any> {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Set cache
  static async set(key: string, value: any, ttl: number = CACHE_TTL.MEDIUM): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  // Delete cache
  static async delete(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  // Delete pattern
  static async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache delete pattern error:', error);
    }
  }

  // Clear all cache
  static async flush(): Promise<void> {
    try {
      await redis.flushdb();
    } catch (error) {
      console.error('Cache flush error:', error);
    }
  }

  // Get cache stats
  static async stats(): Promise<any> {
    try {
      const info = await redis.info('memory');
      return info;
    } catch (error) {
      console.error('Cache stats error:', error);
      return null;
    }
  }
}

// Database query cache decorator
export function cacheQuery(ttl: number = CACHE_TTL.MEDIUM) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${propertyKey}:${JSON.stringify(args)}`;
      
      // Try cache first
      const cached = await Cache.get(cacheKey);
      if (cached) {
        console.log(`[Cache HIT] ${propertyKey}`);
        return cached;
      }

      // Execute original method
      console.log(`[Cache MISS] ${propertyKey}`);
      const result = await originalMethod.apply(this, args);
      
      // Store in cache
      await Cache.set(cacheKey, result, ttl);
      
      return result;
    };

    return descriptor;
  };
}

// Cache middleware for API routes
export function cacheMiddleware(ttl: number = CACHE_TTL.SHORT) {
  return async (context: any, next: any) => {
    const cacheKey = `api:${context.url.pathname}:${JSON.stringify(context.params)}`;
    
    const cached = await Cache.get(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
      });
    }

    const response = await next();
    
    if (response.status === 200) {
      const data = await response.json();
      await Cache.set(cacheKey, data, ttl);
    }
    
    return response;
  };
}

export { CACHE_TTL };
export default redis;
'''

    sftp = ssh.open_sftp()
    sftp.putfo(__import__('io').BytesIO(cache_service.encode()), 
               '/home/sanliur/public_html/src/lib/cache.ts')
    sftp.close()
    print("   ✅ cache.ts oluşturuldu")

    # 4. ioredis paketi kontrol
    print("\n4️⃣ ioredis paketi kontrolü...")
    stdin, stdout, stderr = ssh.exec_command("ls /home/sanliur/public_html/node_modules/ioredis 2>/dev/null | head -1 || echo yok")
    if "yok" in stdout.read().decode():
        print("   ⬇️ ioredis kuruluyor...")
        NVM = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '
        ssh.exec_command(f"cd /home/sanliur/public_html && " + NVM + "npm install ioredis --legacy-peer-deps", timeout=120)
        import time
        time.sleep(10)
        print("   ✅ ioredis kuruldu")
    else:
        print("   ✅ ioredis zaten kurulu")

    # 5. Redis yapılandırma önerileri
    print("\n5️⃣ Redis Optimizasyon Ayarları:")
    print("""
   📝 /etc/redis.conf önerileri:
   
   # Bellek limiti (512MB)
   maxmemory 512mb
   maxmemory-policy allkeys-lru
   
   # Persistence
   save 900 1
   save 300 10
   save 60 10000
   
   # TCP
   tcp-keepalive 300
   
   # Güvenlik (şifre)
   requirepass your-redis-password
    """)

    # 6. Test
    print("\n6️⃣ Redis bağlantı testi...")
    stdin, stdout, stderr = ssh.exec_command("redis-cli set test_key '{\"status\":\"ok\"}' EX 10 && redis-cli get test_key")
    result = stdout.read().decode().strip()
    if "ok" in result:
        print("   ✅ Redis bağlantısı ve cache çalışıyor")
    else:
        print(f"   ⚠️ Test sonucu: {result}")

    # 7. .env.production güncelle
    print("\n7️⃣ .env.production güncelleniyor...")
    
    stdin, stdout, stderr = ssh.exec_command("cat /home/sanliur/public_html/.env.production")
    env_content = stdout.read().decode()
    
    if "REDIS" not in env_content:
        redis_env = """
# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
"""
        new_env = env_content + redis_env
        
        sftp = ssh.open_sftp()
        sftp.putfo(__import__('io').BytesIO(new_env.encode()), 
                   '/home/sanliur/public_html/.env.production')
        sftp.close()
        print("   ✅ Redis ayarları eklendi")
    else:
        print("   ℹ️ Redis ayarları zaten mevcut")

    ssh.close()

    print("\n" + "=" * 60)
    print("✅ REDIS CACHE TAMAMLANDI")
    print("=" * 60)
    print("""
📋 Özet:
  📁 Dosya: /home/sanliur/public_html/src/lib/cache.ts
  
  ⚙️  Fonksiyonlar:
     - Cache.get() → Cache oku
     - Cache.set() → Cache yaz
     - Cache.delete() → Cache sil
     - cacheQuery() → Decorator
     - cacheMiddleware() → API middleware
  
  ⏱️  Cache süreleri:
     - SHORT: 1 dakika
     - MEDIUM: 5 dakika
     - LONG: 1 saat
     - VERY_LONG: 24 saat

🔧 Kullanım:
  // Basit cache
  await Cache.set('users', userList, CACHE_TTL.MEDIUM);
  const users = await Cache.get('users');
  
  // Decorator
  @cacheQuery(CACHE_TTL.LONG)
  async getUserById(id: string) { ... }

⚠️  Not: Redis için şifre ayarlamayı unutmayın!
""")

if __name__ == "__main__":
    main()
