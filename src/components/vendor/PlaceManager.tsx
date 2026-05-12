import { useState, useEffect } from 'react';
import { MapPin, Phone, Clock, DollarSign, Image, Star, Eye, Edit, Save, X, AlertCircle } from 'lucide-react';

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
 const [loadError, setLoadError] = useState<string | null>(null);
 const [saveError, setSaveError] = useState<string | null>(null);

 useEffect(() => {
 fetchPlace();
 }, [placeId]);

 const fetchPlace = async () => {
 setLoadError(null);
 try {
  const res = await fetch(`/api/places/${placeId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const data = json.data ?? json;
  const mapped: Place = {
   id: data.id ?? placeId,
   name: data.name ?? '',
   category: data.category ?? data.category_name ?? '',
   address: data.address ?? '',
   phone: data.phone ?? '',
   description: data.description ?? data.short_description ?? '',
   price_min: Number(data.price_min ?? data.price_range?.split('-')[0] ?? 0),
   price_max: Number(data.price_max ?? data.price_range?.split('-')[1] ?? 0),
   rating: Number(data.rating ?? data.average_rating ?? 0),
   review_count: Number(data.review_count ?? data.total_reviews ?? 0),
   views: Number(data.views ?? data.view_count ?? 0),
   is_active: data.status === 'active' || data.is_active === true,
   opening_hours: data.opening_hours ?? {},
   features: Array.isArray(data.features) ? data.features : [],
  };
  setPlace(mapped);
  setEditedPlace(mapped);
 } catch (err) {
  setLoadError('Mekan bilgileri yüklenemedi. Lütfen sayfayı yenileyin.');
 }
 };

 const handleSave = async () => {
 if (!editedPlace) return;
 setIsSaving(true);
 setSaveError(null);
 try {
  const res = await fetch(`/api/places/${placeId}`, {
   method: 'PUT',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify({
    name: editedPlace.name,
    address: editedPlace.address,
    phone: editedPlace.phone,
    description: editedPlace.description,
    price_min: editedPlace.price_min,
    price_max: editedPlace.price_max,
    opening_hours: editedPlace.opening_hours,
    features: editedPlace.features,
   }),
  });
  if (!res.ok) {
   const json = await res.json().catch(() => ({}));
   throw new Error(json.error ?? json.detail ?? `HTTP ${res.status}`);
  }
  setPlace(editedPlace);
  setIsEditing(false);
 } catch (err) {
  setSaveError(err instanceof Error ? err.message : 'Kaydedilemedi. Lütfen tekrar deneyin.');
 } finally {
  setIsSaving(false);
 }
 };

 const handleCancel = () => {
 setEditedPlace(place);
 setSaveError(null);
 setIsEditing(false);
 };

 if (loadError) return (
 <div className="p-8 flex items-center gap-3 text-red-400 bg-[rgba(239,68,68,0.06)] rounded-sm border border-[rgba(239,68,68,0.2)]">
  <AlertCircle className="w-5 h-5 flex-shrink-0" />
  <span>{loadError}</span>
 </div>
 );
 if (!place) return <div className="p-8 text-[#7A6B58]">Yükleniyor…</div>;

 return (
 <div className="max-w-6xl mx-auto p-4">
 <div className="bg-[var(--bg-card)] rounded-sm p-6 mb-6">
 <div className="flex items-start justify-between">
 <div className="flex items-center gap-4">
 <div className="w-20 h-20 bg-gradient-to-br from-urfa-500 to-isot-600 rounded-sm flex items-center justify-center text-white text-2xl font-bold">
 {place.name.charAt(0)}
 </div>
 <div>
 <h1 className="text-2xl font-bold text-[#1F1410]">{place.name}</h1>
 <p className="text-[#7A6B58] flex items-center gap-1 mt-1">
 <MapPin className="w-4 h-4" />
 {place.category}
 </p>
 <div className="flex items-center gap-4 mt-2">
 <span className={`px-2 py-1 rounded-full text-sm ${place.is_active ? 'bg-[rgba(34,197,94,0.12)] text-green-400' : 'bg-[rgba(239,68,68,0.1)] text-red-700'}`}>
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
 <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-urfa-600 text-white rounded-sm hover:bg-urfa-700">
 <Edit className="w-4 h-4" />
 Düzenle
 </button>
 ) : (
 <>
 {saveError && (
  <span className="flex items-center gap-1 text-xs text-red-400 max-w-xs">
   <AlertCircle className="w-3 h-3 flex-shrink-0" />{saveError}
  </span>
 )}
 <button onClick={handleCancel} className="flex items-center gap-2 px-4 py-2 bg-[rgba(184,115,51,0.06)] text-[#7A6B58] rounded-sm hover:bg-[rgba(184,115,51,0.08)]">
  <X className="w-4 h-4" />
  İptal
 </button>
 <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-sm hover:bg-green-700 disabled:opacity-50">
  <Save className="w-4 h-4" />
  {isSaving ? 'Kaydediliyor…' : 'Kaydet'}
 </button>
 </>
 )}
 </div>
 </div>

 <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t">
 <div className="text-center">
 <div className="text-2xl font-bold text-[#1F1410]">{place.views.toLocaleString()}</div>
 <div className="text-sm text-[#7A6B58] flex items-center justify-center gap-1">
 <Eye className="w-4 h-4" />
 Görüntülenme
 </div>
 </div>
 <div className="text-center">
 <div className="text-2xl font-bold text-[#1F1410]">{place.review_count}</div>
 <div className="text-sm text-[#7A6B58]">Yorum</div>
 </div>
 <div className="text-center">
 <div className="text-2xl font-bold text-[#1F1410]">{place.rating}</div>
 <div className="text-sm text-[#7A6B58]">Ortalama Puan</div>
 </div>
 <div className="text-center">
 <div className="text-2xl font-bold text-[#1F1410]">₺{place.price_min}-{place.price_max}</div>
 <div className="text-sm text-[#7A6B58]">Fiyat Aralığı</div>
 </div>
 </div>
 </div>

 {/* Tabs */}
 <div className="bg-[var(--bg-card)] rounded-sm overflow-hidden">
 <div className="border-b flex">
 {[
 { key: 'info', label: 'Bilgiler', icon: MapPin },
 { key: 'hours', label: 'Çalışma Saatleri', icon: Clock },
 { key: 'photos', label: 'Fotoğraflar', icon: Image },
 { key: 'stats', label: 'İstatistikler', icon: Eye },
 ].map(({ key, label, icon: Icon }) => (
 <button
 key={key}
 onClick={() => setActiveTab(key as 'info' | 'hours' | 'photos' | 'stats')}
 className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
 activeTab === key ? 'text-[#B87333] border-b-2 border-urfa-500' : 'text-[#7A6B58] hover:text-[#1F1410]'
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
 <label className="block text-sm font-medium text-[#7A6B58] mb-2">Mekan Adı</label>
 <input type="text" value={editedPlace?.name} disabled={!isEditing} className="w-full px-4 py-2 border rounded-sm disabled:bg-[rgba(184,115,51,0.04)]" />
 </div>
 <div>
 <label className="block text-sm font-medium text-[#7A6B58] mb-2">Adres</label>
 <textarea value={editedPlace?.address} disabled={!isEditing} rows={3} className="w-full px-4 py-2 border rounded-sm disabled:bg-[rgba(184,115,51,0.04)]" />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-[#7A6B58] mb-2 flex items-center gap-1">
 <Phone className="w-4 h-4" />
 Telefon
 </label>
 <input type="tel" value={editedPlace?.phone} disabled={!isEditing} className="w-full px-4 py-2 border rounded-sm disabled:bg-[rgba(184,115,51,0.04)]" />
 </div>
 <div>
 <label className="block text-sm font-medium text-[#7A6B58] mb-2 flex items-center gap-1">
 <DollarSign className="w-4 h-4" />
 Fiyat Aralığı
 </label>
 <div className="flex gap-2">
 <input type="number" value={editedPlace?.price_min} disabled={!isEditing} className="w-full px-4 py-2 border rounded-sm disabled:bg-[rgba(184,115,51,0.04)]" placeholder="Min" />
 <input type="number" value={editedPlace?.price_max} disabled={!isEditing} className="w-full px-4 py-2 border rounded-sm disabled:bg-[rgba(184,115,51,0.04)]" placeholder="Max" />
 </div>
 </div>
 </div>
 <div>
 <label className="block text-sm font-medium text-[#7A6B58] mb-2">Açıklama</label>
 <textarea value={editedPlace?.description} disabled={!isEditing} rows={4} className="w-full px-4 py-2 border rounded-sm disabled:bg-[rgba(184,115,51,0.04)]" />
 </div>
 </div>
 )}

 {activeTab === 'hours' && (
 <div className="space-y-3">
 {DAY_KEYS.map((day, index) => (
 <div key={day} className="flex items-center gap-4 p-3 bg-[rgba(184,115,51,0.04)] rounded-sm">
 <span className="w-20 font-medium text-[#7A6B58]">{DAYS[index]}</span>
 <span className="text-[#1F1410]">{place.opening_hours[day] || 'Kapalı'}</span>
 </div>
 ))}
 </div>
 )}

 {activeTab === 'stats' && (
 <div className="space-y-6">
 <div className="grid grid-cols-3 gap-4">
 <div className="bg-[rgba(184,115,51,0.06)] p-4 rounded-sm">
 <div className="text-3xl font-bold text-blue-300">2,847</div>
 <div className="text-sm text-[#7A6B58]">Bu Ay Görüntülenme</div>
 </div>
 <div className="bg-[rgba(184,115,51,0.06)] p-4 rounded-sm">
 <div className="text-3xl font-bold text-green-400">89</div>
 <div className="text-sm text-green-600">Telefon Tıklaması</div>
 </div>
 <div className="bg-[rgba(184,115,51,0.06)] p-4 rounded-sm">
 <div className="text-3xl font-bold text-purple-300">156</div>
 <div className="text-sm text-[#B87333]">Yol Tarifi</div>
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
