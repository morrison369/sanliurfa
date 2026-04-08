import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Trash2, Play, Pause, Plus, Save } from 'lucide-react';

interface Campaign {
  id: string;
  place_id: string;
  name: string;
  campaign_type: string;
  status: string;
  budget: number;
  spent: number;
  start_date?: string;
  end_date?: string;
  created_at: string;
}

interface MarketingCampaignBuilderProps {
  placeId?: string;
  onCampaignCreated?: () => void;
}

export default function MarketingCampaignBuilder({ placeId, onCampaignCreated }: MarketingCampaignBuilderProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    place_id: placeId || '',
    name: '',
    description: '',
    campaign_type: 'promotion',
    budget: 0,
    targeting: {},
    creative_content: {}
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/marketing-campaigns');
      const json = await response.json();
      if (json.success) {
        setCampaigns(json.data);
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/marketing-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const json = await response.json();
      if (json.success) {
        setShowForm(false);
        setFormData({
          place_id: placeId || '',
          name: '',
          description: '',
          campaign_type: 'promotion',
          budget: 0,
          targeting: {},
          creative_content: {}
        });
        fetchCampaigns();
        onCampaignCreated?.();
      }
    } catch (error) {
      console.error('Failed to create campaign:', error);
    }
  };

  const handleStatusChange = async (id: string, action: 'publish' | 'pause') => {
    try {
      const response = await fetch(`/api/marketing-campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      const json = await response.json();
      if (json.success) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Failed to update campaign:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Kampanyayı silmek istediğinizden emin misiniz?')) return;

    try {
      const response = await fetch(`/api/marketing-campaigns/${id}`, {
        method: 'DELETE'
      });

      const json = await response.json();
      if (json.success) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Failed to delete campaign:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Pazarlama Kampanyaları</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Yeni Kampanya
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Yeni Kampanya Oluştur</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Kampanya Adı"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                required
              />
              <select
                value={formData.campaign_type}
                onChange={(e) => setFormData({ ...formData, campaign_type: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="promotion">Promosyon</option>
                <option value="awareness">Farkındalık</option>
                <option value="conversion">Dönüşüm</option>
                <option value="retention">Müşteri Tutma</option>
              </select>
            </div>

            <textarea
              placeholder="Kampanya Açıklaması"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              rows={3}
            />

            <input
              type="number"
              placeholder="Bütçe"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              step="0.01"
              min="0"
              required
            />

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Save size={18} />
                Oluştur
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors"
              >
                İptal Et
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {campaigns.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Henüz kampanya yok. Yeni bir kampanya oluşturmak için yukarıdaki butona tıklayın.
          </div>
        ) : (
          campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{campaign.name}</h3>
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded capitalize">
                      {campaign.campaign_type === 'promotion'
                        ? 'Promosyon'
                        : campaign.campaign_type === 'awareness'
                        ? 'Farkındalık'
                        : campaign.campaign_type === 'conversion'
                        ? 'Dönüşüm'
                        : 'Müşteri Tutma'}
                    </span>
                    <span
                      className={`px-2 py-1 rounded capitalize ${
                        campaign.status === 'published'
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : campaign.status === 'paused'
                          ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                          : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                      }`}
                    >
                      {campaign.status === 'published'
                        ? 'Yayında'
                        : campaign.status === 'paused'
                        ? 'Duraklatıldı'
                        : 'Taslak'}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Bütçe: </span>
                      <span className="font-semibold">₺{campaign.budget.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Harcanan: </span>
                      <span className="font-semibold">₺{campaign.spent.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Oluşturma: </span>
                      <span>{format(new Date(campaign.created_at), 'd MMM yyyy', { locale: tr })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {campaign.status === 'draft' && (
                    <button
                      onClick={() => handleStatusChange(campaign.id, 'publish')}
                      className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                      title="Yayınla"
                    >
                      <Play size={20} />
                    </button>
                  )}
                  {campaign.status === 'published' && (
                    <button
                      onClick={() => handleStatusChange(campaign.id, 'pause')}
                      className="p-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                      title="Duraklat"
                    >
                      <Pause size={20} />
                    </button>
                  )}
                  {(campaign.status === 'draft' || campaign.status === 'paused') && (
                    <button
                      onClick={() => handleDelete(campaign.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Sil"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
