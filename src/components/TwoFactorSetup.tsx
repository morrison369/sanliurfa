/**
 * Two-Factor Authentication Setup Component
 * Setup TOTP, email, or SMS 2FA methods
 */

import { useState } from 'react';

interface TwoFactorSetupProps {
 userId: string;
 onSetupComplete?: () => void;
}

export function TwoFactorSetup({ userId: _userId, onSetupComplete }: TwoFactorSetupProps) {
 const [step, setStep] = useState<'method-select' | 'setup' | 'verify'>('method-select');
 const [methodType, setMethodType] = useState<'totp' | 'email' | 'sms'>('totp');
 const [methodId, setMethodId] = useState('');
 const [totpUri, setTotpUri] = useState('');
 const [verificationCode, setVerificationCode] = useState('');
 const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
 const [loading, setLoading] = useState(false);

 const handleSetupMethod = async () => {
 setLoading(true);
 try {
 const response = await fetch('/api/auth/2fa/setup', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ method_type: methodType, method_identifier: methodType === 'totp' ? undefined : '' })
 });

 const data = await response.json();
 if (data.success) {
 setMethodId(data.data.method_id);
 if (data.data.totp_uri) {
 setTotpUri(data.data.totp_uri);
 }
 setStep('verify');
 }
 } catch (error) {
 console.error('Setup failed', error);
 } finally {
 setLoading(false);
 }
 };

 const handleVerify = async () => {
 setLoading(true);
 try {
 const response = await fetch('/api/auth/2fa/verify', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ method_id: methodId, code: verificationCode })
 });

 const data = await response.json();
 if (data.success) {
 setRecoveryCodes(data.data.recovery_codes);
 onSetupComplete?.();
 }
 } catch (error) {
 console.error('Verification failed', error);
 } finally {
 setLoading(false);
 }
 };

 if (recoveryCodes.length > 0) {
 return (
 <div className="space-y-4 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.2)] rounded-sm p-6">
 <h3 className="font-bold text-green-400">✓ 2FA Başarıyla Etkinleştirildi</h3>
 <div>
 <p className="text-sm text-[#7A6B58] mb-3">Acil durum kodlarınız (güvenli bir yerde saklayın):</p>
 <div className="bg-[var(--bg-card)] border border-[rgba(184,115,51,0.14)] rounded p-4 font-mono text-sm space-y-2">
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
 <div className="space-y-4 border rounded-sm p-6">
 <h3 className="font-bold">Doğrulama Kodu Girin</h3>
 
 {totpUri && (
 <div className="text-sm text-[#7A6B58]">
 <p className="mb-2">Authenticator uygulamanızda 6 haneli kodu girin:</p>
 <input
 type="text"
 placeholder="000000"
 value={verificationCode}
 onChange={(e) => setVerificationCode(e.target.value)}
 className="w-full px-4 py-2 border border-[rgba(184,115,51,0.25)] rounded focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 maxLength={6}
 />
 </div>
 )}

 <button
 onClick={handleVerify}
 disabled={loading || verificationCode.length !== 6}
 className="w-full px-4 py-2 bg-urfa-600 text-white rounded hover:bg-urfa-700 disabled:opacity-50"
 >
 {loading ? 'Doğrulanıyor...' : 'Doğrula'}
 </button>
 </div>
 );
 }

 return (
 <div className="space-y-4 border rounded-sm p-6">
 <h3 className="font-bold">İki Faktörlü Kimlik Doğrulama Kur</h3>

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
 className="w-full px-4 py-2 bg-urfa-600 text-white rounded hover:bg-urfa-700 disabled:opacity-50"
 >
 {loading ? 'Ayarlanıyor...' : 'Sonraki'}
 </button>
 </>
 )}
 </div>
 );
}
