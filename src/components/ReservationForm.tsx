import React, { useState, useEffect } from 'react';

interface Place {
  id: string;
  name: string;
  minPartySize?: number;
  maxPartySize?: number;
}

interface ReservationFormProps {
  place: Place;
  onSuccess?: (reservation: any) => void;
}

interface FormData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  reservationDate: string;
  reservationTime: string;
  partySize: number;
  specialRequests: string;
  occasion: string;
}

const OCCASIONS = [
  { value: '', label: 'Özel bir durum yok' },
  { value: 'birthday', label: 'Doğum günü' },
  { value: 'anniversary', label: 'Yıl dönümü' },
  { value: 'business', label: 'İş yemeği' },
  { value: 'romantic', label: 'Romantik akşam yemeği' },
  { value: 'family', label: 'Aile buluşması' },
  { value: 'other', label: 'Diğer' },
];

export default function ReservationForm({ place, onSuccess }: ReservationFormProps) {
  const [formData, setFormData] = useState<FormData>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    reservationDate: '',
    reservationTime: '',
    partySize: 2,
    specialRequests: '',
    occasion: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);

  const minPartySize = place.minPartySize || 1;
  const maxPartySize = place.maxPartySize || 20;

  // Tarih değiştiğinde müsait saatleri getir
  useEffect(() => {
    if (formData.reservationDate) {
      fetchAvailableTimes(formData.reservationDate);
    }
  }, [formData.reservationDate]);

  const fetchAvailableTimes = async (date: string) => {
    setLoadingTimes(true);
    try {
      const response = await fetch(`/api/places/${place.id}/availability?date=${date}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableTimes(data.availableTimes || []);
      }
    } catch (err) {
      console.error('Error fetching available times:', err);
    } finally {
      setLoadingTimes(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'partySize' ? parseInt(value) || 1 : value
    }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    // Format: 5XX XXX XX XX
    if (value.length >= 7) {
      value = `${value.slice(0, 3)} ${value.slice(3, 6)} ${value.slice(6, 8)} ${value.slice(8)}`;
    } else if (value.length >= 4) {
      value = `${value.slice(0, 3)} ${value.slice(3)}`;
    }
    
    setFormData(prev => ({ ...prev, customerPhone: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.customerName.trim()) {
      setError('Ad soyad girilmesi zorunludur');
      return false;
    }
    
    if (!formData.customerPhone.replace(/\D/g, '').match(/^[0-9]{10,11}$/)) {
      setError('Geçerli bir telefon numarası giriniz');
      return false;
    }
    
    if (!formData.reservationDate) {
      setError('Lütfen bir tarih seçin');
      return false;
    }
    
    if (!formData.reservationTime) {
      setError('Lütfen bir saat seçin');
      return false;
    }
    
    if (formData.partySize < minPartySize || formData.partySize > maxPartySize) {
      setError(`Kişi sayısı ${minPartySize} ile ${maxPartySize} arasında olmalıdır`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId: place.id,
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          customerPhone: formData.customerPhone.replace(/\D/g, ''),
          reservationDate: formData.reservationDate,
          reservationTime: formData.reservationTime,
          partySize: formData.partySize,
          specialRequests: formData.specialRequests,
          occasion: formData.occasion,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Rezervasyon oluşturulamadı');
      }

      setSuccess(true);
      onSuccess?.(data.reservation);
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  // Minimum tarih: bugün
  const minDate = new Date().toISOString().split('T')[0];
  // Maksimum tarih: 3 ay sonra
  const maxDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Rezervasyonunuz Alındı!</h3>
        <p className="text-gray-600 mb-4">
          {place.name} için rezervasyon talebiniz başarıyla oluşturuldu.
        </p>
        <p className="text-sm text-gray-500">
          İşletme onayından sonra SMS ve e-posta ile bilgilendirileceksiniz.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {place.name} için Rezervasyon
      </h3>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ad Soyad <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="customerName"
            value={formData.customerName}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="Adınız Soyadınız"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telefon <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            name="customerPhone"
            value={formData.customerPhone}
            onChange={handlePhoneChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="5XX XXX XX XX"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          E-posta (opsiyonel)
        </label>
        <input
          type="email"
          name="customerEmail"
          value={formData.customerEmail}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          placeholder="email@ornek.com"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tarih <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="reservationDate"
            value={formData.reservationDate}
            onChange={handleChange}
            min={minDate}
            max={maxDate}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Saat <span className="text-red-500">*</span>
          </label>
          <select
            name="reservationTime"
            value={formData.reservationTime}
            onChange={handleChange}
            disabled={!formData.reservationDate || loadingTimes}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100"
            required
          >
            <option value="">
              {loadingTimes ? 'Yükleniyor...' : formData.reservationDate ? 'Saat seçin' : 'Önce tarih seçin'}
            </option>
            {availableTimes.map(time => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kişi Sayısı <span className="text-red-500">*</span>
          </label>
          <select
            name="partySize"
            value={formData.partySize}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            required
          >
            {Array.from({ length: maxPartySize - minPartySize + 1 }, (_, i) => minPartySize + i).map(num => (
              <option key={num} value={num}>{num} kişi</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Özel Durum
          </label>
          <select
            name="occasion"
            value={formData.occasion}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            {OCCASIONS.map(occ => (
              <option key={occ.value} value={occ.value}>{occ.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Özel İstekler
        </label>
        <textarea
          name="specialRequests"
          value={formData.specialRequests}
          onChange={handleChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
          placeholder="Özel isteklerinizi buraya yazabilirsiniz (masa tercihi, alerji vb.)"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-red-600 to-orange-500 text-white font-semibold rounded-lg hover:from-red-700 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Gönderiliyor...' : 'Rezervasyon Yap'}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Rezervasyonunuz işletme tarafından onaylandıktan sonra geçerli olacaktır.
      </p>
    </form>
  );
}
