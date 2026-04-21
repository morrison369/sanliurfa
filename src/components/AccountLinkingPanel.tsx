import React from 'react';

export default function AccountLinkingPanel() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
      <h3 className="font-semibold">Sosyal giriş kapalı</h3>
      <p className="mt-1">
        Şu anda yalnızca e-posta ve şifre ile giriş kullanılabilir. Gerçek OAuth sağlayıcıları
        yapılandırıldığında hesap bağlama seçenekleri tekrar açılacaktır.
      </p>
      <div className="mt-3">
        <a href="/profil/ayarlar" className="font-medium text-amber-800 underline dark:text-amber-100">
          Güvenlik ayarlarını düzenle
        </a>
      </div>
    </div>
  );
}
