/**
 * Two-Factor Authentication Setup Component
 * Setup TOTP, email, or SMS 2FA methods
 */

import { useState } from 'react';
import { getApiErrorMessage, unwrapApiPayload } from '@/lib/client-api';

interface TwoFactorSetupProps {
  userId: string;
  onSetupComplete?: () => void;
}

export function TwoFactorSetup({ userId, onSetupComplete }: TwoFactorSetupProps) {
  const [step, setStep] = useState<'method-select' | 'setup' | 'verify'>('method-select');
  const [methodType, setMethodType] = useState<'totp' | 'email' | 'sms'>('totp');
  const [methodId, setMethodId] = useState('');
  const [totpUri, setTotpUri] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSetupMethod = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method_type: methodType, method_identifier: methodType === 'totp' ? undefined : '' })
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(getApiErrorMessage(json, 'İki faktörlü doğrulama kurulamadı'));
      }

      const payload = unwrapApiPayload<{ success?: boolean; data?: { method_id?: string; totp_uri?: string } }>(json);
      if (payload.success && payload.data?.method_id) {
        setMethodId(payload.data.method_id);
        if (payload.data.totp_uri) {
          setTotpUri(payload.data.totp_uri);
        }
        setStep('verify');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'İki faktörlü doğrulama kurulamadı');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method_id: methodId, code: verificationCode })
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(getApiErrorMessage(json, 'Doğrulama başarısız oldu'));
      }

      const payload = unwrapApiPayload<{ success?: boolean; data?: { recovery_codes?: string[] } }>(json);
      if (payload.success) {
        setRecoveryCodes(payload.data?.recovery_codes || []);
        onSetupComplete?.();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Doğrulama başarısız oldu');
    } finally {
      setLoading(false);
    }
  };

  if (recoveryCodes.length > 0) {
    return (
      <div className="space-y-4 bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="font-bold text-green-900">✓ 2FA Başarıyla Etkinleştirildi</h3>
        <div>
          <p className="text-sm text-gray-600 mb-3">Acil durum kodlarınız (güvenli bir yerde saklayın):</p>
          <div className="bg-white border border-gray-200 rounded p-4 font-mono text-sm space-y-2">
            {recoveryCodes.map((code, i) => (
              <div key={i}>{code}</div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="space-y-4 border rounded-lg p-6">
        <h3 className="font-bold">Doğrulama Kodu Girin</h3>
        {error && <p className="text-sm text-red-600">{error}</p>}
        
        {totpUri && (
          <div className="text-sm text-gray-600">
            <p className="mb-2">Authenticator uygulamanızda 6 haneli kodu girin:</p>
            <input
              type="text"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              maxLength={6}
            />
          </div>
        )}

        <button
          onClick={handleVerify}
          disabled={loading || verificationCode.length !== 6}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Doğrulanıyor...' : 'Doğrula'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 border rounded-lg p-6">
      <h3 className="font-bold">İki Faktörlü Kimlik Doğrulama Kur</h3>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {step === 'method-select' && (
        <>
          <div className="space-y-3">
            <label className="flex items-center">
              <input type="radio" checked={methodType === 'totp'} onChange={() => setMethodType('totp')} />
              <span className="ml-2">Authenticator Uygulaması</span>
            </label>
            <label className="flex items-center">
              <input type="radio" checked={methodType === 'email'} onChange={() => setMethodType('email')} />
              <span className="ml-2">E-posta</span>
            </label>
            <label className="flex items-center">
              <input type="radio" checked={methodType === 'sms'} onChange={() => setMethodType('sms')} />
              <span className="ml-2">SMS</span>
            </label>
          </div>

          <button
            onClick={handleSetupMethod}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Ayarlanıyor...' : 'Sonraki'}
          </button>
        </>
      )}
    </div>
  );
}
