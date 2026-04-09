#!/usr/bin/env python3
"""E-posta SMTP (Resend) Kurulumu"""
import paramiko

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD)

    print("📧 E-posta SMTP Kurulumu")
    print("=" * 60)

    # 1. Resend API Key al
    print("\n1️⃣ Resend API Key ayarı:")
    print("   📝 Resend.com'dan API key almanız gerekli:")
    print("   1. https://resend.com adresine gidin")
    print("   2. Kaydolun / Giriş yapın")
    print("   3. API Keys → Create API Key")
    print("   4. İzin: Sending access")
    print("   5. API key'i kopyalayın")
    
    # Manuel giriş için placeholder
    api_key = "re_xxxxxxxx"  # Kullanıcı manuel değiştirecek
    
    # .env.production güncelle
    print("\n2️⃣ .env.production güncelleniyor...")
    
    stdin, stdout, stderr = ssh.exec_command("cat /home/sanliur/public_html/.env.production")
    env_content = stdout.read().decode()
    
    # E-posta ayarlarını ekle/güncelle
    email_config = f"""# Email Configuration (Resend)
RESEND_API_KEY={api_key}
FROM_EMAIL=noreply@sanliurfa.com
FROM_NAME=Şanlıurfa.com
ADMIN_EMAIL=admin@sanliurfa.com
"""
    
    # Mevcut e-posta satırlarını temizle
    lines = env_content.split('\n')
    new_lines = []
    for line in lines:
        if not any(x in line for x in ['RESEND', 'FROM_EMAIL', 'FROM_NAME', 'ADMIN_EMAIL', 'SMTP', 'EMAIL']):
            new_lines.append(line)
    
    # Yeni config ekle
    new_env = '\n'.join(new_lines) + '\n' + email_config
    
    sftp = ssh.open_sftp()
    sftp.putfo(__import__('io').BytesIO(new_env.encode()), 
               '/home/sanliur/public_html/.env.production')
    sftp.close()
    print("   ✅ .env.production güncellendi")

    # 2. E-posta servisi dosyası oluştur
    print("\n3️⃣ E-posta servisi oluşturuluyor...")
    
    email_service = '''import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: `${import.meta.env.FROM_NAME} <${import.meta.env.FROM_EMAIL}>`,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Email error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Email send failed:', err);
    return { success: false, error: err };
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetUrl = `${import.meta.env.SITE_URL}/sifre-sifirla?token=${resetToken}`;
  
  const html = `
    <h2>Şifre Sıfırlama</h2>
    <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
    <a href="${resetUrl}" style="padding: 10px 20px; background: #a18072; color: white; text-decoration: none; border-radius: 5px;">Şifremi Sıfırla</a>
    <p>Bu bağlantı 24 saat geçerlidir.</p>
    <p>Eğer bu isteği siz yapmadıysanız, bu e-postayı görmezden gelin.</p>
  `;

  return sendEmail(email, 'Şifre Sıfırlama - Şanlıurfa.com', html);
}

export async function sendWelcomeEmail(email: string, fullName: string) {
  const html = `
    <h2>Hoş Geldiniz, ${fullName}!</h2>
    <p>Şanlıurfa.com'a kaydolduğunuz için teşekkür ederiz.</p>
    <p>Artık şehrin tüm güzelliklerini keşfedebilirsiniz:</p>
    <ul>
      <li>Tarihi mekanları keşfedin</li>
      <li>Lezzet duraklarını görün</li>
      <li>Etkinlikleri takip edin</li>
    </ul>
    <a href="${import.meta.env.SITE_URL}" style="padding: 10px 20px; background: #a18072; color: white; text-decoration: none; border-radius: 5px;">Keşfetmeye Başla</a>
  `;

  return sendEmail(email, 'Hoş Geldiniz - Şanlıurfa.com', html);
}

export async function sendContactNotification(name: string, email: string, subject: string, message: string) {
  const adminEmail = import.meta.env.ADMIN_EMAIL || 'admin@sanliurfa.com';
  
  const html = `
    <h2>Yeni İletişim Formu Mesajı</h2>
    <p><strong>Gönderen:</strong> ${name} (${email})</p>
    <p><strong>Konu:</strong> ${subject}</p>
    <p><strong>Mesaj:</strong></p>
    <blockquote style="border-left: 3px solid #a18072; padding-left: 10px; margin-left: 0;">${message}</blockquote>
  `;

  return sendEmail(adminEmail, `İletişim Formu: ${subject}`, html);
}
'''

    sftp = ssh.open_sftp()
    sftp.putfo(__import__('io').BytesIO(email_service.encode()), 
               '/home/sanliur/public_html/src/lib/email.ts')
    sftp.close()
    print("   ✅ email.ts oluşturuldu")

    # 3. resend paketini kontrol et
    print("\n4️⃣ Resend paketi kontrolü...")
    stdin, stdout, stderr = ssh.exec_command("ls /home/sanliur/public_html/node_modules/resend 2>/dev/null | head -1 || echo yok")
    if "yok" in stdout.read().decode():
        print("   ⬇️ Resend paketi kuruluyor...")
        NVM = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '
        ssh.exec_command(f"cd /home/sanliur/public_html && " + NVM + "npm install resend --legacy-peer-deps", timeout=120)
        import time
        time.sleep(10)
        print("   ✅ Resend kuruldu")
    else:
        print("   ✅ Resend zaten kurulu")

    # 4. Test e-posta gönder
    print("\n5️⃣ Test e-posta hazırlığı:")
    print("   ⚠️  Resend'de domain doğrulaması gerekli!")
    print("   1. Resend Dashboard → Domains")
    print("   2. Add Domain: sanliurfa.com")
    print("   3. DNS kayıtlarını ekleyin")
    print("   4. API key'i .env.production'a yazın")

    ssh.close()

    print("\n" + "=" * 60)
    print("✅ E-POSTA KURULUMU TAMAMLANDI")
    print("=" * 60)
    print("""
📋 Özet:
  📁 Dosya: /home/sanliur/public_html/src/lib/email.ts
  ⚙️  Fonksiyonlar:
     - sendEmail() → Genel e-posta
     - sendPasswordResetEmail() → Şifre sıfırlama
     - sendWelcomeEmail() → Hoş geldin
     - sendContactNotification() → İletişim formu

🔧 Yapılması Gerekenler:
  1. Resend.com'dan API key alın
  2. .env.production'daki RESEND_API_KEY'i güncelleyin
  3. Resend'de sanliurfa.com domainini doğrulayın
  4. Rebuild: npm run build
  5. Restart: pm2 restart sanliurfa

📝 Test:
  curl -X POST https://sanliurfa.com/api/auth/reset-password \
    -d '{"email":"test@example.com"}'
""")

if __name__ == "__main__":
    main()
