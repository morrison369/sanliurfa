import { useEffect, useState } from 'react';

type EmailState = {
 api_key: string;
 from_email: string;
 api_key_masked: string;
 api_key_set: boolean;
 daily_limit_per_recipient: number;
};
type AnalyticsState = { ga_id: string };
type PaymentState = {
 secret_key: string;
 publishable_key: string;
 webhook_secret: string;
 secret_key_masked: string;
 secret_key_set: boolean;
 webhook_secret_masked: string;
 webhook_secret_set: boolean;
};
type ImageProvidersState = {
 unsplash_access_key: string;
 pexels_api_key: string;
 unsplash_masked: string;
 unsplash_set: boolean;
 pexels_masked: string;
 pexels_set: boolean;
};

type OAuthProviderView = {
 provider_key: string;
 provider_name: string;
 client_id: string;
 client_secret_masked: string;
 client_secret_set: boolean;
 is_enabled: boolean;
 configured: boolean;
 console_url: string;
 console_label: string;
 redirect_uri: string;
};

type OAuthProviderEdit = {
 provider_key: string;
 provider_name: string;
 client_id: string;
 client_secret: string;
 client_secret_masked: string;
 client_secret_set: boolean;
 is_enabled: boolean;
 show_secret: boolean;
 saving: boolean;
 message: string;
 message_status: Status;
 console_url: string;
 console_label: string;
 redirect_uri: string;
};

type SmtpState = {
 host: string;
 port: number;
 secure: boolean;
 user: string;
 pass: string;
 from_email: string;
 pass_set: boolean;
 pass_masked: string;
};

type Section = 'email' | 'analytics' | 'payment' | 'image_providers' | 'smtp';
type Status = 'idle' | 'loading' | 'saving' | 'success' | 'error';

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
 return (
 <div className="bg-[var(--adm-bg-elev)] rounded-sm border border-[var(--adm-bg-active)] p-6 mb-6">
 <h2 className="text-lg font-semibold text-[var(--adm-text)] flex items-center gap-2 mb-5">
 <span>{icon}</span> {title}
 </h2>
 {children}
 </div>
 );
}

function CopyableUrlHint({ label, url, helpText }: { label: string; url: string; helpText?: React.ReactNode }) {
 if (!url) return null;
 return (
 <div className="bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)] rounded-sm p-3 mb-4 text-xs text-blue-300">
 <p className="font-medium mb-2">{label}</p>
 <div className="flex items-center gap-2">
 <code className="flex-1 bg-[var(--adm-bg-elev)] px-2 py-1.5 rounded border border-[rgba(59,130,246,0.2)] font-mono text-[11px] break-all">{url}</code>
 <button
 type="button"
 onClick={() => navigator.clipboard?.writeText(url)}
 className="shrink-0 px-2 py-1.5 bg-[var(--adm-bg-elev)] border border-[rgba(59,130,246,0.2)] rounded text-[11px] hover:bg-[rgba(59,130,246,0.1)]"
 title="Panoya kopyala"
 >
 📋
 </button>
 </div>
 {helpText && <p className="mt-2 text-blue-300">{helpText}</p>}
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
 const [email, setEmail] = useState<EmailState>({ api_key: '', from_email: '', api_key_masked: '', api_key_set: false, daily_limit_per_recipient: 10 });
 const [analytics, setAnalytics] = useState<AnalyticsState>({ ga_id: '' });
 const [payment, setPayment] = useState<PaymentState>({
 secret_key: '',
 publishable_key: '',
 webhook_secret: '',
 secret_key_masked: '',
 secret_key_set: false,
 webhook_secret_masked: '',
 webhook_secret_set: false,
 });
 const [imageProviders, setImageProviders] = useState<ImageProvidersState>({
 unsplash_access_key: '',
 pexels_api_key: '',
 unsplash_masked: '',
 unsplash_set: false,
 pexels_masked: '',
 pexels_set: false,
 });
 const [smtp, setSmtp] = useState<SmtpState>({
 host: '',
 port: 587,
 secure: false,
 user: '',
 pass: '',
 from_email: '',
 pass_set: false,
 pass_masked: '',
 });
 const [status, setStatus] = useState<Record<Section, Status>>({
 email: 'idle',
 analytics: 'idle',
 payment: 'idle',
 image_providers: 'idle',
 smtp: 'idle',
 });
 const [messages, setMessages] = useState<Record<Section, string>>({
 email: '',
 analytics: '',
 payment: '',
 image_providers: '',
 smtp: '',
 });
 const [showKey, setShowKey] = useState(false);
 const [showStripeSecret, setShowStripeSecret] = useState(false);
 const [showWebhookSecret, setShowWebhookSecret] = useState(false);
 const [showUnsplashKey, setShowUnsplashKey] = useState(false);
 const [showPexelsKey, setShowPexelsKey] = useState(false);
 const [showSmtpPass, setShowSmtpPass] = useState(false);
 const [oauthProviders, setOauthProviders] = useState<OAuthProviderEdit[]>([]);
 const [setupUrls, setSetupUrls] = useState<{ stripe_webhook: string; oauth_callback: string; public_app_url: string }>({
 stripe_webhook: '',
 oauth_callback: '',
 public_app_url: '',
 });

 useEffect(() => {
 fetch('/api/admin/site/integrations')
 .then(r => r.json())
 .then(res => {
 if (res.success) {
 if (res.data.setup_urls) {
 setSetupUrls({
 stripe_webhook: res.data.setup_urls.stripe_webhook || '',
 oauth_callback: res.data.setup_urls.oauth_callback || '',
 public_app_url: res.data.setup_urls.public_app_url || '',
 });
 }
 setEmail({
 api_key: '',
 from_email: res.data.email.from_email,
 api_key_masked: res.data.email.api_key_masked,
 api_key_set: res.data.email.api_key_set,
 daily_limit_per_recipient:
 typeof res.data.email.daily_limit_per_recipient === 'number'
 ? res.data.email.daily_limit_per_recipient
 : 10,
 });
 setAnalytics({ ga_id: res.data.analytics.ga_id });
 if (res.data.payment) {
 setPayment({
 secret_key: '',
 publishable_key: res.data.payment.publishable_key || '',
 webhook_secret: '',
 secret_key_masked: res.data.payment.secret_key_masked || '',
 secret_key_set: Boolean(res.data.payment.secret_key_set),
 webhook_secret_masked: res.data.payment.webhook_secret_masked || '',
 webhook_secret_set: Boolean(res.data.payment.webhook_secret_set),
 });
 }
 if (res.data.image_providers) {
 setImageProviders({
 unsplash_access_key: '',
 pexels_api_key: '',
 unsplash_masked: res.data.image_providers.unsplash_masked || '',
 unsplash_set: Boolean(res.data.image_providers.unsplash_set),
 pexels_masked: res.data.image_providers.pexels_masked || '',
 pexels_set: Boolean(res.data.image_providers.pexels_set),
 });
 }
 if (res.data.smtp) {
 setSmtp({
 host: res.data.smtp.host || '',
 port: res.data.smtp.port || 587,
 secure: Boolean(res.data.smtp.secure),
 user: res.data.smtp.user || '',
 pass: '',
 from_email: res.data.smtp.from_email || '',
 pass_set: Boolean(res.data.smtp.pass_set),
 pass_masked: res.data.smtp.pass_masked || '',
 });
 }
 if (res.data.oauth?.providers) {
 setOauthProviders(
 (res.data.oauth.providers as OAuthProviderView[]).map(p => ({
 provider_key: p.provider_key,
 provider_name: p.provider_name,
 client_id: p.client_id || '',
 client_secret: '',
 client_secret_masked: p.client_secret_masked || '',
 client_secret_set: Boolean(p.client_secret_set),
 is_enabled: Boolean(p.is_enabled),
 show_secret: false,
 saving: false,
 message: '',
 message_status: 'idle' as Status,
 console_url: p.console_url || '',
 console_label: p.console_label || '',
 redirect_uri: p.redirect_uri || '',
 })),
 );
 }
 }
 });
 }, []);

 async function saveOAuthProvider(idx: number) {
 const target = oauthProviders[idx];
 if (!target) return;
 setOauthProviders(arr => arr.map((p, i) => (i === idx ? { ...p, saving: true, message: '' } : p)));
 try {
 const res = await fetch('/api/admin/site/integrations', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 section: 'oauth',
 provider_key: target.provider_key,
 client_id: target.client_id,
 client_secret: target.client_secret,
 is_enabled: target.is_enabled,
 }),
 });
 const data = await res.json();
 if (!data.success) throw new Error(data.error || 'Hata');
 setOauthProviders(arr =>
 arr.map((p, i) =>
 i === idx
 ? {
 ...p,
 saving: false,
 client_secret: '',
 client_secret_set: p.client_secret_set || Boolean(target.client_secret),
 show_secret: false,
 message_status: 'success' as Status,
 message: data.message || 'Kaydedildi',
 }
 : p,
 ),
 );
 } catch (err) {
 const message = err instanceof Error ? err.message : 'OAuth sağlayıcısı kaydedilemedi';
 setOauthProviders(arr =>
 arr.map((p, i) =>
 i === idx
 ? { ...p, saving: false, message_status: 'error' as Status, message }
 : p,
 ),
 );
 }
 }

 // Probes a single OAuth provider's auth_url + DB config. Shares the row's
 // StatusBadge state so the admin sees the result inline without a global toast.
 async function testOAuthProvider(idx: number) {
 const target = oauthProviders[idx];
 if (!target) return;
 setOauthProviders(arr =>
 arr.map((p, i) => (i === idx ? { ...p, saving: true, message: 'Test ediliyor…', message_status: 'idle' as Status } : p)),
 );
 try {
 const res = await fetch('/api/admin/site/integrations/test', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ section: 'oauth', provider_key: target.provider_key }),
 });
 const data = await res.json();
 // The test endpoint wraps payload in `{ data: ..., meta: ... }` (apiResponse shape).
 const inner = data?.data ?? data;
 setOauthProviders(arr =>
 arr.map((p, i) =>
 i === idx
 ? {
 ...p,
 saving: false,
 message_status: (inner.success ? 'success' : 'error') as Status,
 message: inner.message || (inner.success ? 'OK' : 'Hata'),
 }
 : p,
 ),
 );
 } catch (err) {
 const message = err instanceof Error ? err.message : 'OAuth testi başarısız';
 setOauthProviders(arr =>
 arr.map((p, i) =>
 i === idx
 ? { ...p, saving: false, message_status: 'error' as Status, message }
 : p,
 ),
 );
 }
 }

 // Hits /api/admin/site/integrations/test which probes the live integration. Result
 // is shown via the section's StatusBadge so the admin sees pass/fail inline.
 async function testIntegration(section: Section) {
 setStatus(s => ({ ...s, [section]: 'saving' }));
 setMessages(m => ({ ...m, [section]: 'Test ediliyor…' }));
 try {
 const res = await fetch('/api/admin/site/integrations/test', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ section }),
 });
 const raw = await res.json();
 // apiResponse() wraps payload as { data: ..., meta: ... } — unwrap.
 const inner = raw?.data ?? raw;
 setStatus(s => ({ ...s, [section]: inner.success ? 'success' : 'error' }));
 setMessages(m => ({ ...m, [section]: inner.message || (inner.success ? 'OK' : 'Hata') }));
 } catch (err) {
 setStatus(s => ({ ...s, [section]: 'error' }));
 setMessages(m => ({ ...m, [section]: err instanceof Error ? err.message : 'Kaydetme başarısız' }));
 }
 }

 // Run every section's "Test Et" probe fully in parallel — section-level and
 // per-provider OAuth probes share the network bottleneck, so serializing OAuth
 // would just block on the slowest provider for no reason. Each updates its own
 // StatusBadge so partial successes appear as they complete.
 async function testAll() {
 const sections: Section[] = ['email', 'smtp', 'analytics', 'payment', 'image_providers'];
 const sectionPromises = sections.map(s => testIntegration(s));
 const oauthPromises = oauthProviders
 .map((p, i) => (p.client_secret_set ? testOAuthProvider(i) : null))
 .filter((p): p is Promise<void> => p !== null);
 await Promise.all([...sectionPromises, ...oauthPromises]);
 }

 async function saveSection(section: Section, payload: Record<string, string>) {
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
 if (section === 'payment') {
 setPayment(p => ({
 ...p,
 secret_key: '',
 webhook_secret: '',
 secret_key_set: p.secret_key_set || Boolean(payload.secret_key),
 webhook_secret_set: p.webhook_secret_set || Boolean(payload.webhook_secret),
 }));
 setShowStripeSecret(false);
 setShowWebhookSecret(false);
 }
 if (section === 'image_providers') {
 setImageProviders(p => ({
 ...p,
 unsplash_access_key: '',
 pexels_api_key: '',
 unsplash_set: p.unsplash_set || Boolean(payload.unsplash_access_key),
 pexels_set: p.pexels_set || Boolean(payload.pexels_api_key),
 }));
 setShowUnsplashKey(false);
 setShowPexelsKey(false);
 }
 if (section === 'smtp') {
 setSmtp(s => ({
 ...s,
 pass: '',
 pass_set: s.pass_set || Boolean(payload.pass),
 }));
 setShowSmtpPass(false);
 }
 } else {
 throw new Error(data.error || 'Hata');
 }
 } catch (err) {
 setStatus(s => ({ ...s, [section]: 'error' }));
 setMessages(m => ({ ...m, [section]: err instanceof Error ? err.message : 'Test başarısız' }));
 }
 }

 // Aggregate "any test running" flag for the master "Tümünü Test Et" button.
 const anyTestRunning = Object.values(status).some(s => s === 'saving') || oauthProviders.some(p => p.saving);

 return (
 <div className="max-w-2xl mx-auto">
 {/* Master test bar */}
 <div className="bg-[var(--adm-bg-elev)] rounded-sm border border-[var(--adm-bg-active)] p-4 mb-6 flex items-center justify-between">
 <div>
 <h2 className="text-sm font-semibold text-[var(--adm-text)]">Tüm Entegrasyonları Test Et</h2>
 <p className="text-xs text-[var(--adm-text-muted)] mt-0.5">Tüm bölümleri tek seferde tarar; sonuçlar aşağıdaki badge'lerde görünür.</p>
 </div>
 <button
 type="button"
 onClick={testAll}
 disabled={anyTestRunning}
 className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-sm hover:bg-emerald-700 disabled:opacity-50"
 >
 {anyTestRunning ? 'Test ediliyor…' : 'Tümünü Test Et'}
 </button>
 </div>

 {/* E-posta */}
 <Section title="E-posta Entegrasyonu (Resend)" icon="✉️">
 <p className="text-xs text-[var(--adm-text-muted)] mb-3">
 Resend hesabı: <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">resend.com/api-keys</a>'den API key alın. Sender e-posta adresinin domaini için <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="underline">resend.com/domains</a>'da DNS doğrulaması (SPF/DKIM) yapın — yoksa e-postalar spam'e düşer.
 </p>
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-[var(--adm-text-muted)] mb-1">
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
 className="flex-1 rounded-sm border border-[var(--adm-border-strong)] px-3 py-2 text-sm bg-[var(--adm-bg-elev)] text-[var(--adm-text)] focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 <button
 type="button"
 onClick={() => setShowKey(v => !v)}
 className="px-3 py-2 text-sm text-[var(--adm-text-muted)] border border-[var(--adm-border-strong)] rounded-sm hover:bg-[var(--adm-bg-hover)]"
 >
 {showKey ? '🙈' : '👁'}
 </button>
 </div>
 <p className="text-xs text-[#4A3828] mt-1">
 <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">resend.com/api-keys</a>'den alınır. Şifre sıfırlama, yorum bildirimleri için gerekli.
 </p>
 </div>
 <div>
 <label className="block text-sm font-medium text-[var(--adm-text-muted)] mb-1">Gönderici E-posta</label>
 <input
 type="email"
 value={email.from_email}
 onChange={e => setEmail(s => ({ ...s, from_email: e.target.value }))}
 placeholder="noreply@sanliurfa.com"
 className="w-full rounded-sm border border-[var(--adm-border-strong)] px-3 py-2 text-sm bg-[var(--adm-bg-elev)] text-[var(--adm-text)] focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-[var(--adm-text-muted)] mb-1">
 Günlük Kişi Başı Limit
 </label>
 <input
 type="number"
 min={0}
 max={10000}
 value={email.daily_limit_per_recipient}
 onChange={e => setEmail(s => ({ ...s, daily_limit_per_recipient: Number(e.target.value) || 0 }))}
 aria-label="Günlük kişi başı email limiti"
 className="w-32 rounded-sm border border-[var(--adm-border-strong)] px-3 py-2 text-sm bg-[var(--adm-bg-elev)] text-[var(--adm-text)] font-mono focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 <p className="text-xs text-[#4A3828] mt-1">
 Aynı alıcıya günde gönderilebilecek maksimum e-posta sayısı. Spam ve maliyet kontrolü için. <strong>0</strong> = sınırsız.
 </p>
 </div>
 <div className="flex items-center gap-3">
 <button
 onClick={() => saveSection('email', {
 api_key: email.api_key,
 from_email: email.from_email,
 daily_limit_per_recipient: String(email.daily_limit_per_recipient),
 })}
 disabled={status.email === 'saving'}
 className="px-4 py-2 bg-urfa-600 text-white text-sm font-medium rounded-sm hover:bg-urfa-700 disabled:opacity-50"
 >
 {status.email === 'saving' ? 'Kaydediliyor…' : 'Kaydet'}
 </button>
 <button
 type="button"
 onClick={() => testIntegration('email')}
 disabled={status.email === 'saving'}
 className="px-4 py-2 bg-[var(--adm-bg-hover)] text-[var(--adm-text-muted)] text-sm font-medium rounded-sm hover:bg-[rgba(184,115,51,0.15)] disabled:opacity-50"
 title="Hesabınıza test e-postası gönderir"
 >
 Test Et
 </button>
 <StatusBadge status={status.email} message={messages.email} />
 </div>
 </div>
 </Section>

 {/* SMTP — Tier 2 fallback for Resend */}
 <Section title="SMTP Sunucu (Resend Fallback)" icon="📮">
 <p className="text-xs text-[var(--adm-text-muted)] mb-4">
 Resend yapılandırılmadığında veya kotaya takıldığında SMTP üzerinden gönderim için. Kendi mail sunucunuz varsa dış API gerektirmez.
 </p>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-[var(--adm-text-muted)] mb-1">SMTP Host</label>
 <input
 type="text"
 value={smtp.host}
 onChange={e => setSmtp(s => ({ ...s, host: e.target.value }))}
 placeholder="smtp.example.com"
 className="w-full rounded-sm border border-[var(--adm-border-strong)] px-3 py-2 text-sm bg-[var(--adm-bg-elev)] text-[var(--adm-text)] font-mono focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-[var(--adm-text-muted)] mb-1">Port</label>
 <input
 type="number"
 value={smtp.port}
 onChange={e => setSmtp(s => ({ ...s, port: Number(e.target.value) || 587 }))}
 placeholder="587"
 className="w-full rounded-sm border border-[var(--adm-border-strong)] px-3 py-2 text-sm bg-[var(--adm-bg-elev)] text-[var(--adm-text)] font-mono focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-[var(--adm-text-muted)] mb-1">Kullanıcı adı</label>
 <input
 type="text"
 value={smtp.user}
 onChange={e => setSmtp(s => ({ ...s, user: e.target.value }))}
 placeholder="user@example.com"
 className="w-full rounded-sm border border-[var(--adm-border-strong)] px-3 py-2 text-sm bg-[var(--adm-bg-elev)] text-[var(--adm-text)] focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-[var(--adm-text-muted)] mb-1">
 Şifre
 {smtp.pass_set && (
 <span className="ml-2 text-xs text-green-600 font-normal">✓ Kayıtlı: {smtp.pass_masked}</span>
 )}
 </label>
 <div className="flex gap-2">
 <input
 type={showSmtpPass ? 'text' : 'password'}
 value={smtp.pass}
 onChange={e => setSmtp(s => ({ ...s, pass: e.target.value }))}
 placeholder={smtp.pass_set ? 'Değiştirmek için yeni şifre' : 'SMTP şifresi'}
 className="flex-1 rounded-sm border border-[var(--adm-border-strong)] px-3 py-2 text-sm bg-[var(--adm-bg-elev)] text-[var(--adm-text)] font-mono focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 <button
 type="button"
 onClick={() => setShowSmtpPass(v => !v)}
 className="px-3 py-2 text-sm text-[var(--adm-text-muted)] border border-[var(--adm-border-strong)] rounded-sm hover:bg-[var(--adm-bg-hover)]"
 >
 {showSmtpPass ? '🙈' : '👁'}
 </button>
 </div>
 </div>
 <div>
 <label className="block text-sm font-medium text-[var(--adm-text-muted)] mb-1">Gönderici E-posta</label>
 <input
 type="email"
 value={smtp.from_email}
 onChange={e => setSmtp(s => ({ ...s, from_email: e.target.value }))}
 placeholder="noreply@sanliurfa.com"
 className="w-full rounded-sm border border-[var(--adm-border-strong)] px-3 py-2 text-sm bg-[var(--adm-bg-elev)] text-[var(--adm-text)] focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 </div>
 <div className="flex items-end">
 <label className="inline-flex items-center gap-2 text-sm">
 <input
 type="checkbox"
 checked={smtp.secure}
 onChange={e => setSmtp(s => ({ ...s, secure: e.target.checked }))}
 className="rounded"
 />
 TLS/SSL (port 465 için açın)
 </label>
 </div>
 </div>
 <div className="flex items-center gap-3 mt-4">
 <button
 onClick={() =>
 saveSection('smtp', {
 host: smtp.host,
 port: String(smtp.port),
 secure: String(smtp.secure),
 user: smtp.user,
 pass: smtp.pass,
 from_email: smtp.from_email,
 })
 }
 disabled={status.smtp === 'saving'}
 className="px-4 py-2 bg-urfa-600 text-white text-sm font-medium rounded-sm hover:bg-urfa-700 disabled:opacity-50"
 >
 {status.smtp === 'saving' ? 'Kaydediliyor…' : 'Kaydet'}
 </button>
 <button
 type="button"
 onClick={() => testIntegration('smtp')}
 disabled={status.smtp === 'saving'}
 className="px-4 py-2 bg-[var(--adm-bg-hover)] text-[var(--adm-text-muted)] text-sm font-medium rounded-sm hover:bg-[rgba(184,115,51,0.15)] disabled:opacity-50"
 title="SMTP sunucusuna bağlanır ve kimlik doğrulamayı test eder (e-posta göndermez)"
 >
 Test Et
 </button>
 <StatusBadge status={status.smtp} message={messages.smtp} />
 </div>
 </Section>

 {/* Analytics */}
 <Section title="Google Analytics 4" icon="📊">
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-[var(--adm-text-muted)] mb-1">Measurement ID</label>
 <input
 type="text"
 value={analytics.ga_id}
 onChange={e => setAnalytics({ ga_id: e.target.value })}
 placeholder="G-XXXXXXXXXX"
 className="w-full rounded-sm border border-[var(--adm-border-strong)] px-3 py-2 text-sm bg-[var(--adm-bg-elev)] text-[var(--adm-text)] font-mono focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 <p className="text-xs text-[#4A3828] mt-1">
 GA4 → Yönetici → Veri Akışları → Web Akışı Ayrıntıları'ndan alınır. Hemen aktif olur, rebuild gerekmez.
 </p>
 </div>
 <div className="flex items-center gap-3">
 <button
 onClick={() => saveSection('analytics', { ga_id: analytics.ga_id })}
 disabled={status.analytics === 'saving'}
 className="px-4 py-2 bg-urfa-600 text-white text-sm font-medium rounded-sm hover:bg-urfa-700 disabled:opacity-50"
 >
 {status.analytics === 'saving' ? 'Kaydediliyor…' : 'Kaydet'}
 </button>
 <button
 type="button"
 onClick={() => testIntegration('analytics')}
 disabled={status.analytics === 'saving'}
 className="px-4 py-2 bg-[var(--adm-bg-hover)] text-[var(--adm-text-muted)] text-sm font-medium rounded-sm hover:bg-[rgba(184,115,51,0.15)] disabled:opacity-50"
 title="GA4 Measurement ID formatını doğrular (G-XXXXXXXXXX)"
 >
 Test Et
 </button>
 <StatusBadge status={status.analytics} message={messages.analytics} />
 </div>
 </div>
 </Section>

 {/* Stripe Ödemeler */}
 <Section title="Stripe Ödemeler" icon="💳">
 <CopyableUrlHint
 label="Stripe Webhook Endpoint URL'si (Stripe Dashboard → Developers → Webhooks'a kaydedin)"
 url={setupUrls.stripe_webhook}
 helpText={
 <>
 <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noopener noreferrer" className="underline">dashboard.stripe.com/webhooks</a> → "Add endpoint" → URL'yi yapıştırın → ihtiyacınız olan event'leri seçin (ör: <code>customer.subscription.*</code>, <code>payment_intent.*</code>) → "Signing secret"i alıp aşağıdaki <strong>Webhook Secret</strong> alanına yazın.
 </>
 }
 />
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-[var(--adm-text-muted)] mb-1">
 Secret Key
 {payment.secret_key_set && (
 <span className="ml-2 text-xs text-green-600 font-normal">✓ Kayıtlı: {payment.secret_key_masked}</span>
 )}
 </label>
 <div className="flex gap-2">
 <input
 type={showStripeSecret ? 'text' : 'password'}
 value={payment.secret_key}
 onChange={e => setPayment(s => ({ ...s, secret_key: e.target.value }))}
 placeholder={payment.secret_key_set ? 'Değiştirmek için yeni key girin' : 'sk_live_... veya sk_test_...'}
 className="flex-1 rounded-sm border border-[var(--adm-border-strong)] px-3 py-2 text-sm bg-[var(--adm-bg-elev)] text-[var(--adm-text)] font-mono focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 <button
 type="button"
 onClick={() => setShowStripeSecret(v => !v)}
 className="px-3 py-2 text-sm text-[var(--adm-text-muted)] border border-[var(--adm-border-strong)] rounded-sm hover:bg-[var(--adm-bg-hover)]"
 >
 {showStripeSecret ? '🙈' : '👁'}
 </button>
 </div>
 <p className="text-xs text-[#4A3828] mt-1">
 <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="underline">dashboard.stripe.com/apikeys</a>'den alınır. Sunucu tarafında ödeme oturumu oluşturmak için kullanılır.
 </p>
 </div>

 <div>
 <label className="block text-sm font-medium text-[var(--adm-text-muted)] mb-1">Publishable Key</label>
 <input
 type="text"
 value={payment.publishable_key}
 onChange={e => setPayment(s => ({ ...s, publishable_key: e.target.value }))}
 placeholder="pk_live_... veya pk_test_..."
 className="w-full rounded-sm border border-[var(--adm-border-strong)] px-3 py-2 text-sm bg-[var(--adm-bg-elev)] text-[var(--adm-text)] font-mono focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 <p className="text-xs text-[#4A3828] mt-1">
 Tarayıcı tarafında Stripe.js başlatmak için kullanılır. Genel olarak güvenli bir değerdir.
 </p>
 </div>

 <div>
 <label className="block text-sm font-medium text-[var(--adm-text-muted)] mb-1">
 Webhook Secret
 {payment.webhook_secret_set && (
 <span className="ml-2 text-xs text-green-600 font-normal">✓ Kayıtlı: {payment.webhook_secret_masked}</span>
 )}
 </label>
 <div className="flex gap-2">
 <input
 type={showWebhookSecret ? 'text' : 'password'}
 value={payment.webhook_secret}
 onChange={e => setPayment(s => ({ ...s, webhook_secret: e.target.value }))}
 placeholder={payment.webhook_secret_set ? 'Değiştirmek için yeni secret girin' : 'whsec_...'}
 className="flex-1 rounded-sm border border-[var(--adm-border-strong)] px-3 py-2 text-sm bg-[var(--adm-bg-elev)] text-[var(--adm-text)] font-mono focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 <button
 type="button"
 onClick={() => setShowWebhookSecret(v => !v)}
 className="px-3 py-2 text-sm text-[var(--adm-text-muted)] border border-[var(--adm-border-strong)] rounded-sm hover:bg-[var(--adm-bg-hover)]"
 >
 {showWebhookSecret ? '🙈' : '👁'}
 </button>
 </div>
 <p className="text-xs text-[#4A3828] mt-1">
 <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noopener noreferrer" className="underline">dashboard.stripe.com/webhooks</a>'tan webhook eklerken alınır. <code className="bg-[var(--adm-bg-hover)] px-1 rounded">/api/billing/webhook</code> endpoint'ini Stripe'a kaydedin.
 </p>
 </div>

 <div className="flex items-center gap-3">
 <button
 onClick={() => saveSection('payment', {
 secret_key: payment.secret_key,
 publishable_key: payment.publishable_key,
 webhook_secret: payment.webhook_secret,
 })}
 disabled={status.payment === 'saving'}
 className="px-4 py-2 bg-urfa-600 text-white text-sm font-medium rounded-sm hover:bg-urfa-700 disabled:opacity-50"
 >
 {status.payment === 'saving' ? 'Kaydediliyor…' : 'Kaydet'}
 </button>
 <button
 type="button"
 onClick={() => testIntegration('payment')}
 disabled={status.payment === 'saving'}
 className="px-4 py-2 bg-[var(--adm-bg-hover)] text-[var(--adm-text-muted)] text-sm font-medium rounded-sm hover:bg-[rgba(184,115,51,0.15)] disabled:opacity-50"
 title="Stripe API'ye küçük bir sorgu gönderir"
 >
 Test Et
 </button>
 <StatusBadge status={status.payment} message={messages.payment} />
 </div>
 </div>
 </Section>

 {/* Resim Sağlayıcıları */}
 <Section title="Resim Sağlayıcıları (Unsplash & Pexels)" icon="🖼️">
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-[var(--adm-text-muted)] mb-1">
 Unsplash Access Key
 {imageProviders.unsplash_set && (
 <span className="ml-2 text-xs text-green-600 font-normal">✓ Kayıtlı: {imageProviders.unsplash_masked}</span>
 )}
 </label>
 <div className="flex gap-2">
 <input
 type={showUnsplashKey ? 'text' : 'password'}
 value={imageProviders.unsplash_access_key}
 onChange={e => setImageProviders(s => ({ ...s, unsplash_access_key: e.target.value }))}
 placeholder={imageProviders.unsplash_set ? 'Değiştirmek için yeni key girin' : 'Unsplash Access Key'}
 className="flex-1 rounded-sm border border-[var(--adm-border-strong)] px-3 py-2 text-sm bg-[var(--adm-bg-elev)] text-[var(--adm-text)] font-mono focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 <button
 type="button"
 onClick={() => setShowUnsplashKey(v => !v)}
 className="px-3 py-2 text-sm text-[var(--adm-text-muted)] border border-[var(--adm-border-strong)] rounded-sm hover:bg-[var(--adm-bg-hover)]"
 >
 {showUnsplashKey ? '🙈' : '👁'}
 </button>
 </div>
 <p className="text-xs text-[#4A3828] mt-1">
 <a href="https://unsplash.com/oauth/applications" target="_blank" rel="noopener noreferrer" className="underline">unsplash.com/oauth/applications</a>'dan alınır. Admin medya arama panelinde kullanılır.
 </p>
 </div>

 <div>
 <label className="block text-sm font-medium text-[var(--adm-text-muted)] mb-1">
 Pexels API Key
 {imageProviders.pexels_set && (
 <span className="ml-2 text-xs text-green-600 font-normal">✓ Kayıtlı: {imageProviders.pexels_masked}</span>
 )}
 </label>
 <div className="flex gap-2">
 <input
 type={showPexelsKey ? 'text' : 'password'}
 value={imageProviders.pexels_api_key}
 onChange={e => setImageProviders(s => ({ ...s, pexels_api_key: e.target.value }))}
 placeholder={imageProviders.pexels_set ? 'Değiştirmek için yeni key girin' : 'Pexels API Key'}
 className="flex-1 rounded-sm border border-[var(--adm-border-strong)] px-3 py-2 text-sm bg-[var(--adm-bg-elev)] text-[var(--adm-text)] font-mono focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 <button
 type="button"
 onClick={() => setShowPexelsKey(v => !v)}
 className="px-3 py-2 text-sm text-[var(--adm-text-muted)] border border-[var(--adm-border-strong)] rounded-sm hover:bg-[var(--adm-bg-hover)]"
 >
 {showPexelsKey ? '🙈' : '👁'}
 </button>
 </div>
 <p className="text-xs text-[#4A3828] mt-1">
 <a href="https://www.pexels.com/api/new/" target="_blank" rel="noopener noreferrer" className="underline">pexels.com/api</a>'dan ücretsiz alınır. Admin medya arama panelinde kullanılır.
 </p>
 </div>

 <div className="flex items-center gap-3">
 <button
 onClick={() => saveSection('image_providers', {
 unsplash_access_key: imageProviders.unsplash_access_key,
 pexels_api_key: imageProviders.pexels_api_key,
 })}
 disabled={status.image_providers === 'saving'}
 className="px-4 py-2 bg-urfa-600 text-white text-sm font-medium rounded-sm hover:bg-urfa-700 disabled:opacity-50"
 >
 {status.image_providers === 'saving' ? 'Kaydediliyor…' : 'Kaydet'}
 </button>
 <button
 type="button"
 onClick={() => testIntegration('image_providers')}
 disabled={status.image_providers === 'saving'}
 className="px-4 py-2 bg-[var(--adm-bg-hover)] text-[var(--adm-text-muted)] text-sm font-medium rounded-sm hover:bg-[rgba(184,115,51,0.15)] disabled:opacity-50"
 title="Her iki sağlayıcıya küçük bir arama sorgusu gönderir"
 >
 Test Et
 </button>
 <StatusBadge status={status.image_providers} message={messages.image_providers} />
 </div>
 </div>
 </Section>

 {/* Sosyal Giriş (OAuth) */}
 <Section title="Sosyal Giriş (Google, Facebook, Twitter)" icon="🔐">
 <p className="text-xs text-[var(--adm-text-muted)] mb-4">
 OAuth client_id ve client_secret bilgilerinizi her sağlayıcı için ayrı ayrı girin. Auth/token URL'leri otomatik olarak ayarlanır. Her sağlayıcı kendi panelinden bir uygulama oluşturmanızı gerektirir.
 </p>
 <div className="space-y-6">
 {oauthProviders.map((p, idx) => (
 <div key={p.provider_key} className="border border-[var(--adm-border)] rounded-sm p-4">
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center gap-2">
 <h3 className="text-sm font-semibold text-[var(--adm-text)]">{p.provider_name}</h3>
 {p.is_enabled && p.client_secret_set && (
 <span className="text-xs px-2 py-0.5 bg-[rgba(34,197,94,0.12)] text-green-400 rounded-sm">Aktif</span>
 )}
 {!p.is_enabled && p.client_secret_set && (
 <span className="text-xs px-2 py-0.5 bg-[var(--adm-bg-hover)] text-[var(--adm-text-muted)] rounded">Devre dışı</span>
 )}
 {!p.client_secret_set && (
 <span className="text-xs px-2 py-0.5 bg-[rgba(234,179,8,0.12)] text-amber-400 rounded-sm">Yapılandırılmamış</span>
 )}
 </div>
 <label className="flex items-center gap-2 text-sm">
 <input
 type="checkbox"
 checked={p.is_enabled}
 onChange={e =>
 setOauthProviders(arr =>
 arr.map((q, i) => (i === idx ? { ...q, is_enabled: e.target.checked } : q)),
 )
 }
 className="rounded"
 />
 Etkin
 </label>
 </div>

 {/* Setup hint: provider console + redirect URI to register on the provider side */}
 {p.console_url && (
 <div className="bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)] rounded-sm p-3 mb-3 text-xs text-blue-300">
 <div className="flex items-start gap-2 mb-2">
 <span>ℹ️</span>
 <div>
 <strong>{p.provider_name}</strong> uygulaması oluşturmak için:{' '}
 <a href={p.console_url} target="_blank" rel="noopener noreferrer" className="underline font-medium">
 {p.console_label}
 </a>
 </div>
 </div>
 <div className="mt-2">
 <p className="mb-1 font-medium">Sağlayıcı paneline kaydedilecek <strong>Redirect URI</strong>:</p>
 <div className="flex items-center gap-2">
 <code className="flex-1 bg-[var(--adm-bg-elev)] px-2 py-1.5 rounded border border-[rgba(59,130,246,0.2)] font-mono text-[11px] break-all">
 {p.redirect_uri}
 </code>
 <button
 type="button"
 onClick={() => navigator.clipboard?.writeText(p.redirect_uri)}
 className="shrink-0 px-2 py-1.5 bg-[var(--adm-bg-elev)] border border-[rgba(59,130,246,0.2)] rounded text-[11px] hover:bg-[rgba(59,130,246,0.1)]"
 title="Panoya kopyala"
 >
 📋
 </button>
 </div>
 </div>
 </div>
 )}

 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-medium text-[var(--adm-text-muted)] mb-1">Client ID</label>
 <input
 type="text"
 value={p.client_id}
 onChange={e =>
 setOauthProviders(arr =>
 arr.map((q, i) => (i === idx ? { ...q, client_id: e.target.value } : q)),
 )
 }
 placeholder={`${p.provider_name} Client ID`}
 className="w-full rounded-sm border border-[var(--adm-border-strong)] px-3 py-2 text-sm bg-[var(--adm-bg-elev)] text-[var(--adm-text)] font-mono focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-[var(--adm-text-muted)] mb-1">
 Client Secret
 {p.client_secret_set && (
 <span className="ml-2 text-xs text-green-600 font-normal">✓ {p.client_secret_masked}</span>
 )}
 </label>
 <div className="flex gap-2">
 <input
 type={p.show_secret ? 'text' : 'password'}
 value={p.client_secret}
 onChange={e =>
 setOauthProviders(arr =>
 arr.map((q, i) => (i === idx ? { ...q, client_secret: e.target.value } : q)),
 )
 }
 placeholder={p.client_secret_set ? 'Değiştirmek için yeni secret' : `${p.provider_name} Client Secret`}
 className="flex-1 rounded-sm border border-[var(--adm-border-strong)] px-3 py-2 text-sm bg-[var(--adm-bg-elev)] text-[var(--adm-text)] font-mono focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 <button
 type="button"
 onClick={() =>
 setOauthProviders(arr =>
 arr.map((q, i) => (i === idx ? { ...q, show_secret: !q.show_secret } : q)),
 )
 }
 className="px-3 py-2 text-sm text-[var(--adm-text-muted)] border border-[var(--adm-border-strong)] rounded-sm hover:bg-[var(--adm-bg-hover)]"
 >
 {p.show_secret ? '🙈' : '👁'}
 </button>
 </div>
 </div>
 </div>

 <div className="flex items-center gap-3 mt-3">
 <button
 onClick={() => saveOAuthProvider(idx)}
 disabled={p.saving}
 className="px-4 py-2 bg-urfa-600 text-white text-sm font-medium rounded-sm hover:bg-urfa-700 disabled:opacity-50"
 >
 {p.saving ? 'Kaydediliyor…' : 'Kaydet'}
 </button>
 <button
 type="button"
 onClick={() => testOAuthProvider(idx)}
 disabled={p.saving || !p.client_secret_set}
 className="px-4 py-2 bg-[var(--adm-bg-hover)] text-[var(--adm-text-muted)] text-sm font-medium rounded-sm hover:bg-[rgba(184,115,51,0.15)] disabled:opacity-50"
 title="auth endpoint'in erişilebilirliğini ve client config'in tamlığını doğrular (OAuth akışı başlatmaz)"
 >
 Test Et
 </button>
 <StatusBadge status={p.message_status} message={p.message} />
 </div>
 </div>
 ))}
 </div>
 </Section>

 <div className="bg-[rgba(234,179,8,0.08)] border border-[rgba(234,179,8,0.25)] rounded-sm p-4 text-sm text-amber-400">
 <strong>Güvenlik notu:</strong> API key'ler veritabanında saklanır ve yalnızca admin rolüne sahip kullanıcılar görebilir. Sunucu yeniden başlatılmadan hemen aktif olur (Stripe, resim sağlayıcıları ve OAuth için anında, e-posta/analytics için 60 saniye).
 </div>
 </div>
 );
}
