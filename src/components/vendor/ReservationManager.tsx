import React, { useState, useEffect } from 'react';

interface Reservation {
  id: string;
  place_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  special_requests: string | null;
  occasion: string | null;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  table_number: string | null;
  notes: string | null;
  confirmation_code: string;
  created_at: string;
}

interface ReservationManagerProps {
  placeId: string;
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  completed: 'bg-blue-100 text-blue-800 border-blue-200',
  no_show: 'bg-gray-100 text-gray-800 border-gray-200',
};

const STATUS_LABELS = {
  pending: 'Bekliyor',
  confirmed: 'Onaylandı',
  cancelled: 'İptal',
  completed: 'Tamamlandı',
  no_show: 'Gelmedi',
};

export default function ReservationManager({ placeId }: ReservationManagerProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadReservations();
  }, [placeId, activeTab]);

  const loadReservations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ placeId });
      
      if (activeTab === 'upcoming') {
        const today = new Date().toISOString().split('T')[0];
        params.append('dateFrom', today);
      }

      const response = await fetch(`/api/reservations?${params}`);
      if (!response.ok) throw new Error('Rezervasyonlar yüklenemedi');

      const data = await response.json();
      setReservations(data.reservations || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (reservationId: string, newStatus: string, notes?: string) => {
    try {
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, notes }),
      });

      if (!response.ok) throw new Error('Durum güncellenemedi');

      await loadReservations();
      setShowModal(false);
      setSelectedReservation(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getFilteredReservations = () => {
    const today = new Date().toISOString().split('T')[0];
    
    switch (activeTab) {
      case 'upcoming':
        return reservations.filter(r => r.reservation_date >= today);
      case 'past':
        return reservations.filter(r => r.reservation_date < today);
      default:
        return reservations;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const filteredReservations = getFilteredReservations();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Rezervasyonlar</h2>
            <p className="text-gray-500 text-sm mt-1">
              {filteredReservations.length} rezervasyon
            </p>
          </div>
          
          <div className="flex gap-2">
            {(['upcoming', 'past', 'all'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab === 'upcoming' ? 'Gelecek' : tab === 'past' ? 'Geçmiş' : 'Tümü'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Reservations List */}
      <div className="divide-y divide-gray-100">
        {filteredReservations.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p>Bu kategoride rezervasyon bulunmuyor.</p>
          </div>
        ) : (
          filteredReservations.map((reservation) => (
            <div
              key={reservation.id}
              className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => {
                setSelectedReservation(reservation);
                setShowModal(true);
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-red-600">
                      {reservation.party_size}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900">{reservation.customer_name}</h3>
                    <p className="text-sm text-gray-500">
                      {formatDate(reservation.reservation_date)} • {formatTime(reservation.reservation_time)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[reservation.status]}`}>
                        {STATUS_LABELS[reservation.status]}
                      </span>
                      {reservation.occasion && (
                        <span className="text-xs text-gray-500">
                          {reservation.occasion}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {reservation.status === 'pending' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus(reservation.id, 'confirmed');
                        }}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Onayla
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus(reservation.id, 'cancelled');
                        }}
                        className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Reddet
                      </button>
                    </>
                  )}
                  <span className="text-sm text-gray-400">
                    #{reservation.confirmation_code}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {showModal && selectedReservation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Rezervasyon Detayı</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Müşteri</p>
                  <p className="font-medium text-gray-900">{selectedReservation.customer_name}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Telefon</p>
                  <p className="font-medium text-gray-900">{selectedReservation.customer_phone}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Tarih</p>
                  <p className="font-medium text-gray-900">{formatDate(selectedReservation.reservation_date)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Saat</p>
                  <p className="font-medium text-gray-900">{formatTime(selectedReservation.reservation_time)}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Kişi Sayısı</p>
                <p className="font-medium text-gray-900">{selectedReservation.party_size} kişi</p>
              </div>

              {selectedReservation.special_requests && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Özel İstekler</p>
                  <p className="text-gray-900">{selectedReservation.special_requests}</p>
                </div>
              )}

              {selectedReservation.occasion && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Özel Durum</p>
                  <p className="text-gray-900">{selectedReservation.occasion}</p>
                </div>
              )}

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Onay Kodu</p>
                <p className="font-mono text-lg font-bold text-red-600">#{selectedReservation.confirmation_code}</p>
              </div>

              {/* Status Actions */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-3">Durum Güncelle</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_LABELS).map(([status, label]) => (
                    <button
                      key={status}
                      onClick={() => updateStatus(selectedReservation.id, status)}
                      disabled={selectedReservation.status === status}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedReservation.status === status
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : STATUS_COLORS[status as keyof typeof STATUS_COLORS].replace('bg-', 'hover:bg-').replace('text-', 'hover:text-') + ' bg-gray-50 text-gray-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
