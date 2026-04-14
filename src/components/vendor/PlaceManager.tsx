import { useState, useEffect } from 'react';
import { MapPin, Phone, Clock, DollarSign, Image, Star, Eye, Edit, Save, X } from 'lucide-react';

interface Place {
  id: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  description: string;
  price_min: number;
  price_max: number;
  rating: number;
  review_count: number;
  views: number;
  is_active: boolean;
  opening_hours: Record<string, string>;
  features: string[];
}

const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export default function PlaceManager({ placeId }: { placeId: string }) {
  const [place, setPlace] = useState<Place | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPlace, setEditedPlace] = useState<Place | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'hours' | 'photos' | 'stats'>('info');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPlace();
  }, [placeId]);

  const fetchPlace = async () => {
    const mockPlace: Place = {
      id: placeId,
      name: 'Ciğerci Aziz Usta',
      category: 'Restoran',
      address: 'Pınarbaşı Mahallesi, 1211. Sk. No:13, Şanlıurfa',
      phone: '+90 538 782 25 78',
      description: 'Şanlıurfa\'da ciğer kebabının en hasını yiyebileceğiniz mekan. 25 yıllık tecrübe.',
      price_min: 450,
      price_max: 650,
      rating: 4.8,
      review_count: 1247,
      views: 2847,
      is_active: true,
      opening_hours: {
        mon: '08:00-22:00', tue: '08:00-22:00', wed: '08:00-22:00',
        thu: '08:00-22:00', fri: '08:00-22:00', sat: '08:00-22:00', sun: '08:00-22:00',
      },
      features: ['WiFi', 'Otopark', 'Paket Servis', 'Temassız Ödeme'],
    };
    setPlace(mockPlace);
    setEditedPlace(mockPlace);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setPlace(editedPlace);
    setIsEditing(false);
    setIsSaving(false);
  };

  const handleCancel = () => {
    setEditedPlace(place);
    setIsEditing(false);
  };

  if (!place) return <div className="p-8">Yükleniyor...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold">
              {place.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{place.name}</h1>
              <p className="text-gray-500 flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4" />
                {place.category}
              </p>
              <div className="flex items-center gap-4 mt-2">
                <span className={`px-2 py-1 rounded-full text-sm ${place.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {place.is_active ? 'Aktif' : 'Pasif'}
                </span>
                <span className="flex items-center gap-1 text-amber-600">
                  <Star className="w-4 h-4 fill-current" />
                  {place.rating} ({place.review_count} yorum)
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
                <Edit className="w-4 h-4" />
                Düzenle
              </button>
            ) : (
              <>
                <button onClick={handleCancel} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                  <X className="w-4 h-4" />
                  İptal
                </button>
                <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{place.views.toLocaleString()}</div>
            <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
              <Eye className="w-4 h-4" />
              Görüntülenme
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{place.review_count}</div>
            <div className="text-sm text-gray-500">Yorum</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{place.rating}</div>
            <div className="text-sm text-gray-500">Ortalama Puan</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">₺{place.price_min}-{place.price_max}</div>
            <div className="text-sm text-gray-500">Fiyat Aralığı</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="border-b flex">
          {[
            { key: 'info', label: 'Bilgiler', icon: MapPin },
            { key: 'hours', label: 'Çalışma Saatleri', icon: Clock },
            { key: 'photos', label: 'Fotoğraflar', icon: Image },
            { key: 'stats', label: 'İstatistikler', icon: Eye },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === key ? 'text-amber-600 border-b-2 border-amber-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mekan Adı</label>
                <input type="text" value={editedPlace?.name} disabled={!isEditing} className="w-full px-4 py-2 border rounded-lg disabled:bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adres</label>
                <textarea value={editedPlace?.address} disabled={!isEditing} rows={3} className="w-full px-4 py-2 border rounded-lg disabled:bg-gray-50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    Telefon
                  </label>
                  <input type="tel" value={editedPlace?.phone} disabled={!isEditing} className="w-full px-4 py-2 border rounded-lg disabled:bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    Fiyat Aralığı
                  </label>
                  <div className="flex gap-2">
                    <input type="number" value={editedPlace?.price_min} disabled={!isEditing} className="w-full px-4 py-2 border rounded-lg disabled:bg-gray-50" placeholder="Min" />
                    <input type="number" value={editedPlace?.price_max} disabled={!isEditing} className="w-full px-4 py-2 border rounded-lg disabled:bg-gray-50" placeholder="Max" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
                <textarea value={editedPlace?.description} disabled={!isEditing} rows={4} className="w-full px-4 py-2 border rounded-lg disabled:bg-gray-50" />
              </div>
            </div>
          )}

          {activeTab === 'hours' && (
            <div className="space-y-3">
              {DAY_KEYS.map((day, index) => (
                <div key={day} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <span className="w-20 font-medium text-gray-700">{DAYS[index]}</span>
                  <span className="text-gray-900">{place.opening_hours[day] || 'Kapalı'}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                  <div className="text-3xl font-bold text-blue-700">2,847</div>
                  <div className="text-sm text-blue-600">Bu Ay Görüntülenme</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                  <div className="text-3xl font-bold text-green-700">89</div>
                  <div className="text-sm text-green-600">Telefon Tıklaması</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                  <div className="text-3xl font-bold text-purple-700">156</div>
                  <div className="text-sm text-purple-600">Yol Tarifi</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
