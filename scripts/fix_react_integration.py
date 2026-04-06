#!/usr/bin/env python3
"""React Integration Düzeltme"""
import paramiko
import time

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD)

    print("⚛️ React Integration Düzeltme")
    print("=" * 70)

    # Mevcut config'i al
    print("\n1️⃣ Mevcut config kontrolü...")
    stdin, stdout, stderr = ssh.exec_command("cat /home/sanliur/public_html/astro.config.mjs")
    current_config = stdout.read().decode()
    
    if "@astrojs/react" in current_config:
        print("   ✅ React integration zaten mevcut")
        ssh.close()
        return
    else:
        print("   ❌ React integration eksik")

    # Yeni config oluştur
    print("\n2️⃣ Yeni astro.config.mjs oluşturuluyor...")
    
    new_config = '''import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import compress from 'astro-compress';
import react from '@astrojs/react';

const site = process.env.SITE_URL || 'https://sanliurfa.com';

export default defineConfig({
  site,
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [
    react(),
    tailwind(),
    sitemap({
      filter: (page) => !page.includes('/admin') && !page.includes('/profil') && !page.includes('/api'),
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
    }),
    compress({
      CSS: true,
      HTML: true,
      JavaScript: true,
      Image: false,
      SVG: true,
    }),
  ],
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      cssCodeSplit: true,
    },
    ssr: {
      noExternal: ['@astrojs/internal-helpers'],
    },
  },
});
'''

    sftp = ssh.open_sftp()
    sftp.putfo(__import__('io').BytesIO(new_config.encode()), 
               '/home/sanliur/public_html/astro.config.mjs')
    sftp.close()
    print("   ✅ astro.config.mjs güncellendi")

    # @astrojs/react kurulu mu kontrol et
    print("\n3️⃣ @astrojs/react paketi kontrolü...")
    stdin, stdout, stderr = ssh.exec_command("ls /home/sanliur/public_html/node_modules/@astrojs/react 2>/dev/null | head -1 || echo 'yok'")
    if "yok" in stdout.read().decode():
        print("   ⬇️ @astrojs/react kuruluyor...")
        NVM = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '
        stdin, stdout, stderr = ssh.exec_command(
            f"cd /home/sanliur/public_html && " + NVM + "npm install @astrojs/react --legacy-peer-deps 2>&1",
            timeout=120
        )
        
        import time
        start = time.time()
        while not stdout.channel.exit_status_ready():
            if time.time() - start > 20:
                print("      ⏳ Kurulum devam ediyor...")
                start = time.time()
            time.sleep(1)
        
        result = stdout.read().decode()
        if "added" in result:
            print("   ✅ @astrojs/react kuruldu")
        else:
            print(f"   ⚠️ Durum: {result[-300:]}")
    else:
        print("   ✅ @astrojs/react zaten kurulu")

    # Rebuild
    print("\n4️⃣ Rebuild yapılıyor...")
    NVM = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '
    stdin, stdout, stderr = ssh.exec_command(
        f"cd /home/sanliur/public_html && " + NVM + "npm run build 2>&1",
        timeout=180
    )
    
    start = time.time()
    while not stdout.channel.exit_status_ready():
        if time.time() - start > 20:
            print("      ⏳ Build devam ediyor...")
            start = time.time()
        time.sleep(1)
    
    build_result = stdout.read().decode()
    if "dist/server" in build_result and "Complete" in build_result:
        print("   ✅ Build başarılı")
    else:
        print(f"   ⚠️ Build durumu: {build_result[-500:]}")

    # PM2 restart
    print("\n5️⃣ Uygulama yeniden başlatılıyor...")
    ssh.exec_command(NVM + "pm2 restart sanliurfa")
    time.sleep(3)
    print("   ✅ Uygulama yeniden başlatıldı")

    # Test
    print("\n6️⃣ HTTP Test...")
    time.sleep(2)
    stdin, stdout, stderr = ssh.exec_command("curl -m 3 -s -o /dev/null -w '%{http_code}' http://127.0.0.1:6000/")
    code = stdout.read().decode().strip()
    if code == "200":
        print(f"   ✅ HTTP 200 - Site çalışıyor!")
    else:
        print(f"   ⚠️ HTTP {code}")

    ssh.close()

    print("=" * 70)
    print("✅ REACT INTEGRATION TAMAMLANDI")
    print("=" * 70)

if __name__ == "__main__":
    main()
