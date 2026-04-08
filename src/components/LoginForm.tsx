import React, { useState } from 'react';

interface LoginFormProps {
  onSuccess?: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Giriş başarısız');
      }

      if (data.requiresTwoFactor) {
        // 2FA required
        setRequires2FA(true);
        setTempToken(data.tempToken);
        setPassword(''); // Clear password for security
      } else if (data.success) {
        // Login successful without 2FA
        setEmail('');
        setPassword('');
        onSuccess?.();
        // Redirect will happen via navigation
        window.location.href = '/';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsVerifying2FA(true);

    if (!/^\d{6}$/.test(code)) {
      setError('Kod 6 haneli bir sayı olmalıdır');
      setIsVerifying2FA(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/login/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, code })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '2FA doğrulama başarısız');
      }

      if (data.success) {
        // 2FA verification successful
        setEmail('');
        setCode('');
        setTempToken(null);
        setRequires2FA(false);
        onSuccess?.();
        // Redirect
        window.location.href = '/';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsVerifying2FA(false);
    }
  };

  if (requires2FA) {
    return (
      <form onSubmit={handleVerify2FA} className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">İki Faktörlü Doğrulama</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Kimlik doğrulayıcı uygulamanızdan 6 haneli kodu girin.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Doğrulama Kodu
          </label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            className="w-full text-center text-3xl tracking-widest font-mono px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
            disabled={isVerifying2FA}
          />
        </div>

        <button
          type="submit"
          disabled={isVerifying2FA || code.length !== 6}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {isVerifying2FA ? 'Doğrulanıyor...' : 'Doğrula'}
        </button>

        <button
          type="button"
          onClick={() => {
            setRequires2FA(false);
            setTempToken(null);
            setCode('');
            setError(null);
          }}
          className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm py-2"
        >
          Geri Dön
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleEmailPasswordLogin} className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Giriş Yap</h2>
      </div>

      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          E-Posta
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ornek@email.com"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Şifre
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
      </button>

      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        Hesabınız yok mu?{' '}
        <a href="/kayit" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
          Kayıt olun
        </a>
      </div>
    </form>
  );
}
