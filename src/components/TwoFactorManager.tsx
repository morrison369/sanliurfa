import React, { useState, useEffect } from 'react';

interface TwoFactorManagerProps {
  onStatusChange?: (enabled: boolean) => void;
}

export default function TwoFactorManager({ onStatusChange }: TwoFactorManagerProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [isDisabling, setIsDisabling] = useState(false);

  useEffect(() => {
    checkTwoFactorStatus();
  }, []);

  const checkTwoFactorStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/users/2fa/status');

      if (!response.ok) {
        throw new Error('Failed to check 2FA status');
      }

      const data = await response.json();
      setIsEnabled(data.twoFactorEnabled);
      onStatusChange?.(data.twoFactorEnabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSetup = async () => {
    setError(null);
    setSuccessMessage(null);

    try {
      setIsLoading(true);
      const response = await fetch('/api/users/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '2FA ayarı başlatılamadı');
      }

      const data = await response.json();
      setQrCodeUrl(data.qrCodeUrl);
      setSecret(data.secret);
      setIsSetupMode(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!/^\d{6}$/.test(verificationCode)) {
      setError('Kod 6 haneli bir sayı olmalıdır');
      return;
    }

    setError(null);
    setIsVerifying(true);

    try {
      const response = await fetch('/api/users/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '2FA doğrulanamadı');
      }

      const data = await response.json();
      setBackupCodes(data.backupCodes);
      setShowBackupCodes(true);
      setIsEnabled(true);
      setSuccessMessage('2FA başarıyla etkinleştirildi!');
      setVerificationCode('');
      setIsSetupMode(false);
      setQrCodeUrl(null);
      setSecret(null);
      onStatusChange?.(true);

      // Auto-hide success message
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisable = async () => {
    if (!disablePassword) {
      setError('Şifre gerekli');
      return;
    }

    setError(null);
    setIsDisabling(true);

    try {
      const response = await fetch('/api/users/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePassword })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '2FA devre dışı bırakılamadı');
      }

      setIsEnabled(false);
      setSuccessMessage('2FA devre dışı bırakıldı');
      setDisablePassword('');
      setShowBackupCodes(false);
      onStatusChange?.(false);

      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsDisabling(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (isLoading && !isSetupMode) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 text-sm">
          {successMessage}
        </div>
      )}

      {!isSetupMode ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">İki Faktörlü Kimlik Doğrulama</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Hesabınızı ek güvenlik katmanı ile koruyun
              </p>
            </div>
            {isEnabled ? (
              <div className="flex items-center gap-2">
                <span className="text-green-600 dark:text-green-400">✓</span>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">Etkinleştirildi</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">—</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Devre dışı</span>
              </div>
            )}
          </div>

          {isEnabled && (
            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                2FA etkinleştirilmiş olarak giriş yaparken kimlik doğrulama kodu sağlamanız gerekecektir.
              </p>
            </div>
          )}

          {!isEnabled ? (
            <button
              onClick={handleStartSetup}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading ? 'Kuruluyor...' : 'Etkinleştir'}
            </button>
          ) : (
            <button
              onClick={() => setShowBackupCodes(!showBackupCodes)}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium mb-3"
            >
              {showBackupCodes ? 'Yedek Kodları Gizle' : 'Yedek Kodları Göster'}
            </button>
          )}

          {showBackupCodes && backupCodes.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Yedek Kodları Kaydet
              </p>
              <div className="bg-white dark:bg-gray-800 rounded p-3 font-mono text-sm space-y-2 mb-4 max-h-48 overflow-y-auto">
                {backupCodes.map((code, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 text-gray-700 dark:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                    onClick={() => copyToClipboard(code)}
                  >
                    <span>{code}</span>
                    <span className="text-xs text-gray-500">Kopyala</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Bu kodları güvenli bir yerde saklayın. Kimlik doğrulayıcı uygulamanıza erişiminizi kaybederseniz, bu kodları hesabınıza erişmek için kullanabilirsiniz.
              </p>
            </div>
          )}

          {isEnabled && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                2FA'yı Devre Dışı Bırakmak İçin Şifrenizi Girin
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="Şifreniz"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  onClick={handleDisable}
                  disabled={isDisabling || !disablePassword}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isDisabling ? 'Kapatılıyor...' : 'Kapat'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">2FA Kurulumu</h3>

          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Adım 1:</strong> Aşağıdaki QR kodunu Google Authenticator, Microsoft Authenticator veya Authy gibi bir uygulamayla tarayın.
            </p>
          </div>

          {qrCodeUrl && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex justify-center">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">QR Kod</p>
                <div className="bg-white p-4 rounded inline-block">
                  {/* QR code will be generated client-side with qrcode.react */}
                  <div className="w-40 h-40 bg-gray-200 flex items-center justify-center rounded text-xs text-gray-500">
                    Tarama için QR kodu
                  </div>
                </div>
              </div>
            </div>
          )}

          {secret && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Veya şu anahtarı el ile girin:</p>
              <div className="bg-white dark:bg-gray-800 rounded p-3 font-mono text-sm text-gray-900 dark:text-white break-all">
                {secret}
              </div>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Adım 2:</strong> Kimlik doğrulayıcı uygulamanızdan 6 haneli kodu girin.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Doğrulama Kodu
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="flex-1 px-4 py-2 text-center text-2xl tracking-widest border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <button
                onClick={handleVerifyCode}
                disabled={isVerifying || verificationCode.length !== 6}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isVerifying ? 'Doğrulanıyor...' : 'Doğrula'}
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setIsSetupMode(false);
              setQrCodeUrl(null);
              setSecret(null);
              setVerificationCode('');
              setError(null);
            }}
            className="w-full px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            İptal Et
          </button>
        </div>
      )}
    </div>
  );
}
