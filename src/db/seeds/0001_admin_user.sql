-- ============================================
-- Admin Kullanıcı (İlk Giriş İçin)
-- ============================================
-- Email: admin@sanliurfa.com
-- Şifre: Admin2026!
-- ÖNEMLİ: Production'da şifreyi hemen değiştirin!

INSERT INTO users (
  email, password_hash, full_name, role, status
) VALUES (
  'admin@sanliurfa.com',
  '$2b$12$/UNc7lg9tQDZj.vGDVbGA.agHQmH.jqLuyV30KL31.hbBNotH/N6u',
  'Site Yöneticisi',
  'admin',
  'active'
)
ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  status = 'active';
