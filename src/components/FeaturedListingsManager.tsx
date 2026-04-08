import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Trash2, Eye, TrendingUp, Plus } from 'lucide-react';

interface FeaturedListing {
  id: string;
  place_id: string;
  title: string;
  position_tier: string;
  start_date: string;
  end_date: string;
  status: string;
  views_count: number;
  clicks_count: number;
  conversions_count: number;
  cost_per_day: number;
  total_cost: number;
}

interface FeaturedListingsManagerProps {
  onListingCreated?: () => void;
}

export default function FeaturedListingsManager({ onListingCreated }: FeaturedListingsManagerProps) {
  const [listings, setListings] = useState<FeaturedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    place_id: '',
    title: '',
    position_tier: 'standard',
    start_date: '',
    end_date: '',
    cost_per_day: 0,
    description: ''
  });

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/featured-listings?my=true');
      const json = await response.json();
      if (json.success) {
        setListings(json.data);
      }
    } catch (error) {
      console.error('Failed to fetch listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/featured-listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const json = await response.json();
      if (json.success) {
        setShowForm(false);
        setFormData({
          place_id: '',
          title: '',
          position_tier: 'standard',
          start_date: '',
          end_date: '',
          cost_per_day: 0,
          description: ''
        });
        fetchListings();
        onListingCreated?.();
      }
    } catch (error) {
      console.error('Failed to create listing:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yeminli listeyi silmek istediğinizden emin misiniz?')) return;

    try {
      const response = await fetch(`/api/featured-listings/${id}`, {
        method: 'DELETE'
      });

      const json = await response.json();
      if (json.success) {
        fetchListings();
      }
    } catch (error) {
      console.error('Failed to delete listing:', error);
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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Yeminli Listeler</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Yeni Liste
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Yeni Yeminli Liste Oluştur</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Başlık"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                required
              />
              <select
                value={formData.position_tier}
                onChange={(e) => setFormData({ ...formData, position_tier: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="standard">Standart</option>
                <option value="premium">Premium</option>
                <option value="featured">Öne Çıkan</option>
              </select>
            </div>

            <textarea
              placeholder="Açıklama"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              rows={3}
            />

            <div className="grid grid-cols-3 gap-4">
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                required
              />
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                required
              />
              <input
                type="number"
                placeholder="Günlük Maliyet"
                value={formData.cost_per_day}
                onChange={(e) => setFormData({ ...formData, cost_per_day: parseFloat(e.target.value) })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                step="0.01"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
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
        {listings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Henüz yeminli liste yok. Yeni bir tane oluşturmak için yukarıdaki butona tıklayın.
          </div>
        ) : (
          listings.map((listing) => (
            <div
              key={listing.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{listing.title}</h3>
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded capitalize">
                      {listing.position_tier === 'standard'
                        ? 'Standart'
                        : listing.position_tier === 'premium'
                        ? 'Premium'
                        : 'Öne Çıkan'}
                    </span>
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded capitalize">
                      {listing.status === 'active'
                        ? 'Aktif'
                        : listing.status === 'scheduled'
                        ? 'Planlanmış'
                        : 'Süresi Dolmuş'}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Eye size={16} className="text-gray-400" />
                      <span>{listing.views_count} görüntülenme</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp size={16} className="text-gray-400" />
                      <span>{listing.clicks_count} tıklama</span>
                    </div>
                    <div>
                      <span className="text-sm">
                        {format(new Date(listing.start_date), 'd MMM yyyy', { locale: tr })} -{' '}
                        {format(new Date(listing.end_date), 'd MMM yyyy', { locale: tr })}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold">₺{listing.total_cost.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(listing.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
