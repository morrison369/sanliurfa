import { useEffect, useState } from 'react';

type EmailState = { api_key: string; from_email: string; api_key_masked: string; api_key_set: boolean };
type AnalyticsState = { ga_id: string };

type Status = 'idle' | 'loading' | 'saving' | 'success' | 'error';

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-5">
        <span>{icon}</span> {title}
      </h2>
      {children}
    </div>
  );
}

function StatusBadge({ status, message }: { status: Status; message: string }) {
  if (status === 'idle' || status === 'loading' || status === 'saving') return null;
  return (
    <span className={`text-sm font-medium ${status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
      {message}
    </span>
  );
}

export default function IntegrationsSettings() {
  const [email, setEmail] = useState<EmailState>({ api_key: '', from_email: '', api_key_masked: '', api_key_set: false });
  const [analytics, setAnalytics] = useState<AnalyticsState>({ ga_id: '' });
  const [status, setStatus] = useState<{ email: Status; analytics: Status }>({ email: 'idle', analytics: 'idle' });
  const [messages, setMessages] = useState<{ email: string; analytics: string }>({ email: '', analytics: '' });
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    fetch('/api/admin/site/integrations')
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setEmail({
            api_key: '',
            from_email: res.data.email.from_email,
            api_key_masked: res.data.email.api_key_masked,
            api_key_set: res.data.email.api_key_set,
          });
          setAnalytics({ ga_id: res.data.analytics.ga_id });
        }
      });
  }, []);

  async function saveSection(section: 'email' | 'analytics', payload: Record<string, string>) {
    setStatus(s => ({ ...s, [section]: 'saving' }));
    setMessages(m => ({ ...m, [section]: '' }));
    try {
      const res = await fetch('/api/admin/site/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, ...payload }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(s => ({ ...s, [section]: 'success' }));
        setMessages(m => ({ ...m, [section]: data.message }));
        if (section === 'email') {
          setEmail(e => ({ ...e, api_key: '', api_key_set: true }));
          setShowKey(false);
        }
      } else {
        throw new Error(data.error || 'Hata');
      }
    } catch (err: any) {
      setStatus(s => ({ ...s, [section]: 'error' }));
      setMessages(m => ({ ...m, [section]: err.message }));
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* E-posta */}
      <Section title="E-posta Entegrasyonu (Resend)" icon="✉️">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resend API Key
              {email.api_key_set && (
                <span className="ml-2 text-xs text-green-600 font-normal">✓ Kayıtlı: {email.api_key_masked}</span>
              )}
            </label>
            <div className="flex gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                value={email.api_key}
                onChange={e => setEmail(s => ({ ...s, api_key: e.target.value }))}
                placeholder={email.api_key_set ? 'Değiştirmek için yeni key girin' : 're_xxxxxxxxxxxx'}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className="px-3 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {showKey ? '🙈' : '👁'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">resend.com/api-keys</a>'den alınır. Şifre sıfırlama, yorum bildirimleri için gerekli.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gönderici E-posta</label>
            <input
              type="email"
              value={email.from_email}
              onChange={e => setEmail(s => ({ ...s, from_email: e.target.value }))}
              placeholder="noreply@sanliurfa.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => saveSection('email', { api_key: email.api_key, from_email: email.from_email })}
              disabled={status.email === 'saving'}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {status.email === 'saving' ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
            <StatusBadge status={status.email} message={messages.email} />
          </div>
        </div>
      </Section>

      {/* Analytics */}
      <Section title="Google Analytics 4" icon="📊">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Measurement ID</label>
            <input
              type="text"
              value={analytics.ga_id}
              onChange={e => setAnalytics({ ga_id: e.target.value })}
              placeholder="G-XXXXXXXXXX"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              GA4 → Yönetici → Veri Akışları → Web Akışı Ayrıntıları'ndan alınır. Hemen aktif olur, rebuild gerekmez.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => saveSection('analytics', { ga_id: analytics.ga_id })}
              disabled={status.analytics === 'saving'}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {status.analytics === 'saving' ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
            <StatusBadge status={status.analytics} message={messages.analytics} />
          </div>
        </div>
      </Section>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Güvenlik notu:</strong> API key'ler veritabanında saklanır ve yalnızca admin rolüne sahip kullanıcılar görebilir. Sunucu yeniden başlatılmadan hemen aktif olur.
      </div>
    </div>
  );
}
