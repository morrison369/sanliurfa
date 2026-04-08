/**
 * Campaign Builder Component
 * Create and manage email campaigns
 */
import { useEffect, useState } from 'react';

interface Campaign {
  id: string;
  campaign_name: string;
  status: string;
  sent_count: number;
  open_count: number;
  click_count: number;
  created_at: string;
}

export function CampaignBuilder() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    campaign_name: '',
    subject_line: '',
    from_name: 'Şanlıurfa Rehberi',
    from_email: 'noreply@sanliurfa.com',
    html_content: '',
    campaign_type: 'promotional'
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/marketing/campaigns');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch campaigns', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setFormData({
          campaign_name: '',
          subject_line: '',
          from_name: 'Şanlıurfa Rehberi',
          from_email: 'noreply@sanliurfa.com',
          html_content: '',
          campaign_type: 'promotional'
        });
        setShowForm(false);
        await fetchCampaigns();
      }
    } catch (err) {
      console.error('Failed to create campaign', err);
    }
  };

  const getOpenRate = (campaign: Campaign) => {
    if (campaign.sent_count === 0) return 0;
    return ((campaign.open_count / campaign.sent_count) * 100).toFixed(1);
  };

  const getClickRate = (campaign: Campaign) => {
    if (campaign.open_count === 0) return 0;
    return ((campaign.click_count / campaign.open_count) * 100).toFixed(1);
  };

  if (loading) {
    return <div className="p-4 text-center">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Create Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          + Yeni Kampanya Oluştur
        </button>
      )}

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreateCampaign} className="bg-white rounded-lg shadow p-6 space-y-4">
          <input
            type="text"
            placeholder="Kampanya Adı"
            required
            value={formData.campaign_name}
            onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="text"
            placeholder="Konu Başlığı"
            required
            value={formData.subject_line}
            onChange={(e) => setFormData({ ...formData, subject_line: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Gönderenin Adı"
              value={formData.from_name}
              onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="email"
              placeholder="Gönderici E-posta"
              value={formData.from_email}
              onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <textarea
            placeholder="HTML İçerik"
            required
            value={formData.html_content}
            onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-40 font-mono text-sm"
          />

          <select
            value={formData.campaign_type}
            onChange={(e) => setFormData({ ...formData, campaign_type: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="promotional">Promosyon</option>
            <option value="newsletter">Haber Bülteni</option>
            <option value="transactional">İşlemsel</option>
            <option value="welcome">Hoşgeldin</option>
          </select>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Oluştur
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-medium"
            >
              İptal
            </button>
          </div>
        </form>
      )}

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">Henüz kampanya oluşturulmadı.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{campaign.campaign_name}</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(campaign.created_at).toLocaleDateString('tr-TR')}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded font-medium ${
                  campaign.status === 'sent'
                    ? 'bg-green-100 text-green-700'
                    : campaign.status === 'scheduled'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-blue-100 text-blue-700'
                }`}>
                  {campaign.status === 'sent' ? 'Gönderildi' : campaign.status === 'scheduled' ? 'Planlandı' : 'Taslak'}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Gönderilen</p>
                  <p className="text-xl font-bold text-blue-600">{campaign.sent_count}</p>
                </div>
                <div>
                  <p className="text-gray-600">Açılı</p>
                  <p className="text-xl font-bold text-green-600">{campaign.open_count}</p>
                  <p className="text-xs text-gray-500">{getOpenRate(campaign)}%</p>
                </div>
                <div>
                  <p className="text-gray-600">Tıklandı</p>
                  <p className="text-xl font-bold text-purple-600">{campaign.click_count}</p>
                  <p className="text-xs text-gray-500">{getClickRate(campaign)}%</p>
                </div>
                <div className="text-right">
                  <a
                    href={`/marketing/campaign/${campaign.id}`}
                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs font-medium"
                  >
                    Düzenle
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
