import React, { useState, useEffect } from 'react';

interface Webhook {
  id: string;
  event: string;
  url: string;
  active: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
}

interface WebhookManagerProps {
  userId: string;
  token: string;
}

export default function WebhookManager({ userId, token }: WebhookManagerProps) {
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

      if (!res.ok) throw new Error('Failed to load webhooks');
      const data = await res.json();
      setWebhooks(data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

      if (!res.ok) throw new Error('Failed to create webhook');

      setFormData({ event: '', url: '', secret: '' });
      setShowForm(false);
      await loadWebhooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (webhookId: string) => {
    if (!confirm('Bu webhook\'u silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`${API_URL}/${webhookId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to delete webhook');
      await loadWebhooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Webhooks</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {showForm ? 'İptal' : 'Yeni Webhook'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Olay Türü
            </label>
            <select
              value={formData.event}
              onChange={(e) => setFormData({ ...formData, event: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seçiniz...</option>
              {eventOptions.map(event => (
                <option key={event} value={event}>{event}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://example.com/webhook"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Secret (İsteğe Bağlı)
            </label>
            <input
              type="password"
              value={formData.secret}
              onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
              placeholder="Webhook imzalaması için secret"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
          >
            {loading ? 'Kaydediliyor...' : 'Webhook Oluştur'}
          </button>
        </form>
      )}

      <div className="space-y-4">
        {loading && webhooks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
        ) : webhooks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Henüz webhook oluşturulmadı.
          </div>
        ) : (
          webhooks.map(webhook => (
            <div key={webhook.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{webhook.event}</h3>
                  <p className="text-sm text-gray-600 mt-1 break-all">{webhook.url}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    webhook.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {webhook.active ? 'Aktif' : 'İnaktif'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <p className="text-gray-600">Oluşturulma</p>
                  <p className="font-medium text-gray-900">
                    {new Date(webhook.createdAt).toLocaleDateString('tr-TR')}
                  </p>
                </div>
                {webhook.lastTriggeredAt && (
                  <div>
                    <p className="text-gray-600">Son Tetikleme</p>
                    <p className="font-medium text-gray-900">
                      {new Date(webhook.lastTriggeredAt).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleDelete(webhook.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                >
                  Sil
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(webhook.id);
                    alert('Webhook ID kopyalandı');
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm"
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
