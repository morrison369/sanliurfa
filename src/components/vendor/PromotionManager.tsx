import { useState, useEffect} from 'react';

interface Promotion {
  id: string;
  title: string;
  description: string;
  promotion_type: string;
  discount_value: number | null;
  discount_percent: number | null;
  promo_code: string | null;
  start_date: string;
  end_date: string;
  status: 'active' | 'paused' | 'expired';
  featured: boolean;
  usage_count: number;
  usage_limit: number | null;
  views: number;
}

interface PromotionManagerProps {
  placeId: string;
}

const PROMOTION_TYPES = [
  { value: 'discount', label: 'İndirim', icon: '💰' },
  { value: 'percentage_off', label: 'Yüzde İndirim', icon: '%' },
  { value: 'bogo', label: 'Alana Bedava', icon: '🎁' },
  { value: 'free_item', label: 'Hediye Ürün', icon: '🆓' },
  { value: 'happy_hour', label: 'Mutlu Saatler', icon: '🍻' },
  { value: 'special_offer', label: 'Özel Teklif', icon: '⭐' },
];

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  expired: 'bg-gray-100 text-gray-800',
};

const STATUS_LABELS = {
  active: 'Aktif',
  paused: 'Durduruldu',
  expired: 'Süresi Doldu',
};

export default function PromotionManager({ placeId }: PromotionManagerProps) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    promotionType: 'discount',
    discountValue: '',
    discountPercent: '',
    promoCode: '',
    usageLimit: '',
    minPurchaseAmount: '',
    startDate: '',
    endDate: '',
    featured: false,
  });

  useEffect(() => {
    loadPromotions();
  }, [placeId]);

  const loadPromotions = async () => {
    try {
      const response = await fetch(`/api/promotions?placeId=${placeId}`);
      if (!response.ok) throw new Error('Kampanyalar yüklenemedi.');
      const data = await response.json();
      setPromotions(data.promotions || []);
    } catch (err) {
      console.error('Kampanyalar yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId,
          title: formData.title,
          description: formData.description,
          promotionType: formData.promotionType,
          discountValue: formData.discountValue ? parseFloat(formData.discountValue) : null,
          discountPercent: formData.discountPercent ? parseInt(formData.discountPercent) : null,
          promoCode: formData.promoCode || null,
          usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
          minPurchaseAmount: formData.minPurchaseAmount ? parseFloat(formData.minPurchaseAmount) : null,
          startDate: formData.startDate,
          endDate: formData.endDate,
          featured: formData.featured,
        }),
      });

      if (!response.ok) throw new Error('Kampanya oluşturulamadı.');

      await loadPromotions();
      setShowModal(false);
      resetForm();
    } catch (err) {
      setError('Kampanya oluşturulamadı');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      promotionType: 'discount',
      discountValue: '',
      discountPercent: '',
      promoCode: '',
      usageLimit: '',
      minPurchaseAmount: '',
      startDate: '',
      endDate: '',
      featured: false,
    });
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/promotions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error('Kampanya durumu güncellenemedi.');
      await loadPromotions();
    } catch (err) {
      setError('Durum güncellenemedi');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-red-700 text-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-4 text-lg leading-none">×</button>
        </div>
      )}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Kampanyalar</h2>
          <p className="text-gray-500 text-sm mt-1">
            {promotions.length} aktif kampanya
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <span>+</span> Yeni Kampanya
        </button>
      </div>

      <div className="divide-y divide-gray-100">
        {promotions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>Henüz kampanya oluşturmadınız.</p>
            <p className="text-sm mt-1">İlk kampanyanızı oluşturarak müşteri çekin!</p>
          </div>
        ) : (
          promotions.map((promo) => (
            <div key={promo.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{promo.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[promo.status]}`}>
                      {STATUS_LABELS[promo.status]}
                    </span>
                    {promo.featured && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                        Öne Çıkan
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mt-1">{promo.description}</p>
                  
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                    {promo.discount_percent && (
                      <span className="text-green-600 font-medium">%{promo.discount_percent} İndirim</span>
                    )}
                    {promo.discount_value && (
                      <span className="text-green-600 font-medium">₺{promo.discount_value} İndirim</span>
                    )}
                    {promo.promo_code && (
                      <span className="bg-gray-100 px-2 py-1 rounded font-mono">Kod: {promo.promo_code}</span>
                    )}
                    <span className="text-gray-500">
                      {new Date(promo.start_date).toLocaleDateString('tr-TR')} - {new Date(promo.end_date).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right text-sm">
                    <div className="text-gray-900 font-medium">{promo.views} görüntülenme</div>
                    {promo.usage_limit && (
                      <div className="text-gray-500">{promo.usage_count}/{promo.usage_limit} kullanım</div>
                    )}
                  </div>
                  
                  {promo.status === 'active' ? (
                    <button
                      onClick={() => updateStatus(promo.id, 'paused')}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Durdur
                    </button>
                  ) : promo.status === 'paused' ? (
                    <button
                      onClick={() => updateStatus(promo.id, 'active')}
                      className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Aktifleştir
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Oluşturma penceresi */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Yeni Kampanya</h3>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kampanya Adı</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="Örn: Yılbaşına Özel %20 İndirim"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  rows={3}
                  placeholder="Kampanya detayları..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kampanya Tipi</label>
                <select
                  value={formData.promotionType}
                  onChange={(e) => setFormData({ ...formData, promotionType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  {PROMOTION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">İndirim %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discountPercent}
                    onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    placeholder="20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">İndirim ₺</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    placeholder="50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Promosyon Kodu</label>
                  <input
                    type="text"
                    value={formData.promoCode}
                    onChange={(e) => setFormData({ ...formData, promoCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 uppercase"
                    placeholder="YENIYIL20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kullanım Limiti</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    placeholder="Sınırsız için boş bırak"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-4 h-4 text-red-600 rounded"
                />
                <span className="text-sm text-gray-700">Öne çıkan kampanya olarak işaretle</span>
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
