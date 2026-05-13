import { useState, useEffect} from 'react';

interface Webhook {
 id: string;
 event: string;
 url: string;
 active: boolean;
 createdAt: string;
 lastTriggeredAt?: string;
}

interface WebhookManagerProps {
 token: string;
}

export default function WebhookManager({ token }: WebhookManagerProps) {
 const [webhooks, setWebhooks] = useState<Webhook[]>([]);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [showForm, setShowForm] = useState(false);
 const [formData, setFormData] = useState({
 event: '',
 url: '',
 secret: ''
 });

 const API_URL = '/api/webhooks';

 useEffect(() => {
 loadWebhooks();
 }, []);

 const loadWebhooks = async () => {
 setLoading(true);
 try {
 const res = await fetch(API_URL, {
 headers: {
 'Authorization': `Bearer ${token}`
 }
 });

 if (!res.ok) throw new Error('Webhook listesi yüklenemedi.');
 const data = await res.json();
 setWebhooks(data.data || []);
 setError(null);
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Bilinmeyen hata oluştu.');
 } finally {
 setLoading(false);
 }
 };

 const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
 e.preventDefault();
 setLoading(true);

 try {
 const res = await fetch(API_URL, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify(formData)
 });

 if (!res.ok) throw new Error('Webhook oluşturulamadı.');

 setFormData({ event: '', url: '', secret: '' });
 setShowForm(false);
 await loadWebhooks();
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Bilinmeyen hata oluştu.');
 } finally {
 setLoading(false);
 }
 };

 const handleDelete = async (webhookId: string) => {
 if (!await (window as any).showConfirm?.('Bu webhook\'u silmek istediğinize emin misiniz?')) return;

 try {
 const res = await fetch(`${API_URL}/${webhookId}`, {
 method: 'DELETE',
 headers: {
 'Authorization': `Bearer ${token}`
 }
 });

 if (!res.ok) throw new Error('Webhook silinemedi.');
 await loadWebhooks();
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Bilinmeyen hata oluştu.');
 }
 };

 const eventOptions = [
 'place.created',
 'place.updated',
 'place.deleted',
 'review.created',
 'review.deleted',
 'user.registered',
 'user.blocked',
 'message.sent'
 ];

 return (
 <div className="space-y-6">
 {error && (
 <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] rounded-sm p-4">
 <p className="text-red-700 text-sm">{error}</p>
 </div>
 )}

 <div className="flex justify-between items-center">
 <h2 className="text-2xl font-bold text-[#1F1410]">Webhooks</h2>
 <button
 onClick={() => setShowForm(!showForm)}
 className="px-4 py-2 bg-urfa-600 text-white rounded-sm hover:bg-urfa-700 transition"
 >
 {showForm ? 'İptal' : 'Yeni Webhook'}
 </button>
 </div>

 {showForm && (
 <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] rounded-sm shadow-md p-6 space-y-4">
 <div>
 <label className="block text-sm font-medium text-[#7A6B58] mb-2">
 Olay Türü
 </label>
 <select
 value={formData.event}
 onChange={(e) => setFormData({ ...formData, event: e.target.value })}
 required
 className="w-full px-3 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 >
 <option value="">Seçiniz...</option>
 {eventOptions.map(event => (
 <option key={event} value={event}>{event}</option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-[#7A6B58] mb-2">
 URL
 </label>
 <input
 type="url"
 value={formData.url}
 onChange={(e) => setFormData({ ...formData, url: e.target.value })}
 placeholder="https://example.com/webhook"
 required
 className="w-full px-3 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-[#7A6B58] mb-2">
 Gizli Anahtar (İsteğe Bağlı)
 </label>
 <input
 type="password"
 autoComplete="off"
 value={formData.secret}
 onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
 placeholder="Webhook imzalaması için gizli anahtar"
 className="w-full px-3 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 </div>

 <button
 type="submit"
 disabled={loading}
 className="w-full px-4 py-2 bg-green-600 text-white rounded-sm hover:bg-green-700 disabled:bg-[rgba(184,115,51,0.2)] transition"
 >
 {loading ? 'Kaydediliyor...' : 'Webhook Oluştur'}
 </button>
 </form>
 )}

 <div className="space-y-4">
 {loading && webhooks.length === 0 ? (
 <div className="text-center py-8 text-[#7A6B58]">Yükleniyor…</div>
 ) : webhooks.length === 0 ? (
 <div className="text-center py-8 text-[#7A6B58]">
 Henüz webhook oluşturulmadı.
 </div>
 ) : (
 webhooks.map(webhook => (
 <div key={webhook.id} className="bg-[var(--bg-card)] rounded-sm shadow-md p-6">
 <div className="flex justify-between items-start mb-4">
 <div className="flex-1">
 <h3 className="font-semibold text-[#1F1410]">{webhook.event}</h3>
 <p className="text-sm text-[#7A6B58] mt-1 break-all">{webhook.url}</p>
 </div>
 <span
 className={`px-3 py-1 rounded-full text-sm font-medium ${
 webhook.active
 ? 'bg-[rgba(34,197,94,0.12)] text-green-400'
 : 'bg-[rgba(184,115,51,0.06)] text-[#1F1410]'
 }`}
 >
 {webhook.active ? 'Aktif' : 'İnaktif'}
 </span>
 </div>

 <div className="grid grid-cols-2 gap-4 text-sm mb-4">
 <div>
 <p className="text-[#7A6B58]">Oluşturulma</p>
 <p className="font-medium text-[#1F1410]">
 {new Date(webhook.createdAt).toLocaleDateString('tr-TR')}
 </p>
 </div>
 {webhook.lastTriggeredAt && (
 <div>
 <p className="text-[#7A6B58]">Son Tetikleme</p>
 <p className="font-medium text-[#1F1410]">
 {new Date(webhook.lastTriggeredAt).toLocaleDateString('tr-TR')}
 </p>
 </div>
 )}
 </div>

 <div className="flex gap-2">
 <button
 onClick={() => handleDelete(webhook.id)}
 className="px-4 py-2 bg-red-600 text-white rounded-sm hover:bg-red-700 transition text-sm"
 >
 Sil
 </button>
 <button
 onClick={() => {
 navigator.clipboard.writeText(webhook.id);
 window.toast?.success('Webhook ID kopyalandı');
 }}
 className="px-4 py-2 bg-[rgba(184,115,51,0.2)] text-white rounded-sm hover:bg-[var(--bg-card)] transition text-sm"
 >
 ID'yi Kopyala
 </button>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 );
}
