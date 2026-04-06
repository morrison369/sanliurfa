#!/usr/bin/env python3
"""Admin Panel Ayarlar Yönetimi"""
import paramiko

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD)

    print("⚙️ Admin Panel Ayarlar Yönetimi Kurulumu")
    print("=" * 70)

    # 1. Settings tablosu oluştur
    print("\n1️⃣ Veritabanı settings tablosu oluşturuluyor...")
    
    settings_table = """
CREATE TABLE IF NOT EXISTS site_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    type VARCHAR(50) DEFAULT 'string',
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Varsayılan ayarlar
INSERT INTO site_settings (key, value, type, description, is_public) VALUES
('site_name', 'Şanlıurfa.com', 'string', 'Site adı', true),
('site_description', 'Şanlıurfa şehir rehberi - Tarihin sıfır noktası', 'string', 'Site açıklaması', true),
('site_url', 'https://sanliurfa.com', 'string', 'Site URL', true),
('resend_api_key', '', 'secret', 'Resend API Key', false),
('ga_tracking_id', '', 'string', 'Google Analytics ID', false),
('from_email', 'noreply@sanliurfa.com', 'string', 'Gönderici e-posta', true),
('from_name', 'Şanlıurfa.com', 'string', 'Gönderici adı', true),
('meta_keywords', 'Şanlıurfa, Göbeklitepe, Balıklıgöl, turizm, gezi', 'string', 'Meta keywords', true),
('meta_author', 'Şanlıurfa.com', 'string', 'Meta author', true),
('og_image', '/images/og-default.jpg', 'string', 'Varsayılan sosyal medya görseli', true),
('twitter_handle', '@sanliurfa', 'string', 'Twitter kullanıcı adı', true),
('facebook_page', '', 'string', 'Facebook sayfa URL', true),
('instagram_page', '', 'string', 'Instagram sayfa URL', true),
('contact_email', 'info@sanliurfa.com', 'string', 'İletişim e-posta', true),
('contact_phone', '', 'string', 'İletişim telefon', true),
('address', '', 'string', 'Adres', true),
('maintenance_mode', 'false', 'boolean', 'Bakım modu', false),
('cache_enabled', 'true', 'boolean', 'Cache aktif', false)
ON CONFLICT (key) DO NOTHING;
"""

    stdin, stdout, stderr = ssh.exec_command(f"sudo -u postgres psql -d sanliur_sanliurfa -c \"{settings_table}\" 2>&1")
    result = stdout.read().decode()
    if "CREATE TABLE" in result or "INSERT" in result or result.strip() == "":
        print("   ✅ Settings tablosu oluşturuldu")
    else:
        print(f"   ⚠️ Durum: {result[:200]}")

    # 2. Settings API endpoint'i
    print("\n2️⃣ Settings API endpoint'i oluşturuluyor...")
    
    settings_api = '''import type { APIRoute } from 'astro';
import { query, queryOne } from '../../lib/postgres';

// GET - Tüm ayarları veya tek bir ayarı getir
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Admin kontrolü
    if (!locals.isAdmin) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    if (key) {
      // Tek ayar getir
      const setting = await queryOne(
        'SELECT * FROM site_settings WHERE key = $1',
        [key]
      );
      
      if (!setting) {
        return new Response(JSON.stringify({ error: 'Setting not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ data: setting }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Tüm ayarları getir
      const result = await query('SELECT * FROM site_settings ORDER BY key');
      
      return new Response(JSON.stringify({ data: result.rows }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error: any) {
    console.error('Settings GET error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST - Yeni ayar ekle veya güncelle
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Admin kontrolü
    if (!locals.isAdmin) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { key, value, type = 'string', description, is_public = false } = body;

    if (!key) {
      return new Response(JSON.stringify({ error: 'Key is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Upsert (varsa güncelle, yoksa ekle)
    const result = await queryOne(
      `INSERT INTO site_settings (key, value, type, description, is_public, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (key) 
       DO UPDATE SET value = $2, type = $3, description = $4, is_public = $5, updated_at = NOW()
       RETURNING *`,
      [key, value, type, description, is_public]
    );

    // .env.production'ı güncelle (secret ayarlar için)
    if (key === 'resend_api_key' || key === 'ga_tracking_id') {
      await updateEnvFile(key, value);
    }

    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Settings POST error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE - Ayar sil
export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    // Admin kontrolü
    if (!locals.isAdmin) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    if (!key) {
      return new Response(JSON.stringify({ error: 'Key is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await query('DELETE FROM site_settings WHERE key = $1', [key]);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Settings DELETE error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// .env.production güncelleme fonksiyonu
async function updateEnvFile(key: string, value: string) {
  try {
    const fs = await import('fs/promises');
    const path = '/home/sanliur/public_html/.env.production';
    
    let content = await fs.readFile(path, 'utf-8');
    
    const envKey = key.toUpperCase();
    const newLine = `${envKey}=${value}`;
    
    if (content.includes(`${envKey}=`)) {
      // Var olan satırı güncelle
      content = content.replace(new RegExp(`${envKey}=.*`, 'g'), newLine);
    } else {
      // Yeni satır ekle
      content += `\\n${newLine}\\n`;
    }
    
    await fs.writeFile(path, content);
  } catch (error) {
    console.error('Env file update error:', error);
  }
}
'''

    sftp = ssh.open_sftp()
    
    # API dizini oluştur
    try:
        sftp.mkdir('/home/sanliur/public_html/src/pages/api/admin')
    except:
        pass
    
    sftp.putfo(__import__('io').BytesIO(settings_api.encode()), 
               '/home/sanliur/public_html/src/pages/api/admin/settings.ts')
    sftp.close()
    print("   ✅ settings.ts API endpoint'i oluşturuldu")

    # 3. Public settings API (herkese açık)
    print("\n3️⃣ Public settings API oluşturuluyor...")
    
    public_settings_api = '''import type { APIRoute } from 'astro';
import { query } from '../../lib/postgres';

// Herkese açık ayarları getir
export const GET: APIRoute = async () => {
  try {
    const result = await query(
      'SELECT key, value, type FROM site_settings WHERE is_public = true ORDER BY key'
    );
    
    // Object formatına çevir
    const settings: Record<string, any> = {};
    result.rows.forEach((row: any) => {
      settings[row.key] = row.value;
    });
    
    return new Response(JSON.stringify({ data: settings }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600' // 1 saat cache
      }
    });
  } catch (error: any) {
    console.error('Public settings error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
'''

    sftp = ssh.open_sftp()
    sftp.putfo(__import__('io').BytesIO(public_settings_api.encode()), 
               '/home/sanliur/public_html/src/pages/api/settings.ts')
    sftp.close()
    print("   ✅ Public settings API oluşturuldu")

    # 4. Settings helper fonksiyonu
    print("\n4️⃣ Settings helper fonksiyonu...")
    
    settings_helper = '''import { query, queryOne } from './postgres';

// Cache için basit object
const settingsCache: Record<string, { value: any; expires: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 dakika

export async function getSetting(key: string, defaultValue: any = null): Promise<any> {
  try {
    // Cache kontrolü
    const cached = settingsCache[key];
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }
    
    const result = await queryOne(
      'SELECT value, type FROM site_settings WHERE key = $1',
      [key]
    );
    
    if (!result) return defaultValue;
    
    let value = result.value;
    
    // Type dönüşümü
    switch (result.type) {
      case 'boolean':
        value = value === 'true' || value === true;
        break;
      case 'number':
        value = parseFloat(value);
        break;
      case 'json':
        try {
          value = JSON.parse(value);
        } catch {
          value = defaultValue;
        }
        break;
    }
    
    // Cache'e al
    settingsCache[key] = { value, expires: Date.now() + CACHE_TTL };
    
    return value;
  } catch (error) {
    console.error(`getSetting(${key}) error:`, error);
    return defaultValue;
  }
}

export async function getPublicSettings(): Promise<Record<string, any>> {
  try {
    const result = await query(
      'SELECT key, value, type FROM site_settings WHERE is_public = true'
    );
    
    const settings: Record<string, any> = {};
    result.rows.forEach((row: any) => {
      let value = row.value;
      switch (row.type) {
        case 'boolean':
          value = value === 'true' || value === true;
          break;
        case 'number':
          value = parseFloat(value);
          break;
        case 'json':
          try { value = JSON.parse(value); } catch {}
          break;
      }
      settings[row.key] = value;
    });
    
    return settings;
  } catch (error) {
    console.error('getPublicSettings error:', error);
    return {};
  }
}

export function clearSettingsCache() {
  Object.keys(settingsCache).forEach(key => delete settingsCache[key]);
}
'''

    sftp = ssh.open_sftp()
    sftp.putfo(__import__('io').BytesIO(settings_helper.encode()), 
               '/home/sanliur/public_html/src/lib/settings.ts')
    sftp.close()
    print("   ✅ settings.ts helper oluşturuldu")

    ssh.close()

    print("\n" + "=" * 70)
    print("✅ ADMIN AYARLAR YÖNETİMİ TAMAMLANDI")
    print("=" * 70)
    print("""
📋 Özet:
  🗄️  Veritabanı: site_settings tablosu
  🔌 API Endpoint'leri:
     - GET/POST/DELETE /api/admin/settings
     - GET /api/settings (public)
  📁 Helper: /src/lib/settings.ts

🔧 Admin Panel Kullanımı:
  
  1. Giriş yap: https://sanliurfa.com/admin
  2. Ayarlar menüsünden:
     - Resend API Key gir
     - Google Analytics ID gir
     - Site meta bilgilerini düzenle
     - Sosyal medya linklerini ekle
  3. Kaydet → Otomatik .env güncellenir

⚠️  ÖNEMLİ:
  Rebuild gerekebilir: npm run build && pm2 restart sanliurfa
""")

if __name__ == "__main__":
    main()
