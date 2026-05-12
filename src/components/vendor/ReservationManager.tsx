import { useState, useEffect } from 'react';
import { CalendarDays, X } from 'lucide-react';
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
 pending: 'bg-[rgba(234,179,8,0.12)] text-yellow-400 border-[rgba(234,179,8,0.25)]',
 confirmed: 'bg-[rgba(34,197,94,0.12)] text-green-400 border-[rgba(34,197,94,0.2)]',
 cancelled: 'bg-[rgba(239,68,68,0.1)] text-red-300 border-[rgba(239,68,68,0.25)]',
 completed: 'bg-[rgba(59,130,246,0.1)] text-blue-300 border-[rgba(59,130,246,0.2)]',
 no_show: 'bg-[rgba(184,115,51,0.06)] text-[#1F1410] border-[rgba(184,115,51,0.14)]',
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
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Rezervasyonlar yüklenemedi');
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
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Durum güncellenemedi');
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
 <div className="bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)]">
 {/* Header */}
 <div className="p-6 border-b border-[rgba(184,115,51,0.14)]">
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h2 className="text-xl font-semibold text-[#1F1410]">Rezervasyonlar</h2>
 <p className="text-[#7A6B58] text-sm mt-1">
 {filteredReservations.length} rezervasyon
 </p>
 </div>
 
 <div className="flex gap-2">
 {(['upcoming', 'past', 'all'] as const).map((tab) => (
 <button
 key={tab}
 onClick={() => setActiveTab(tab)}
 className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
 activeTab === tab
 ? 'bg-red-600 text-white'
 : 'bg-[rgba(184,115,51,0.06)] text-[#7A6B58] hover:bg-[rgba(184,115,51,0.08)]'
 }`}
 >
 {tab === 'upcoming' ? 'Gelecek' : tab === 'past' ? 'Geçmiş' : 'Tümü'}
 </button>
 ))}
 </div>
 </div>
 </div>

 {error && (
 <div className="mx-6 mt-4 p-4 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] rounded-sm text-red-700">
 {error}
 </div>
 )}

 {/* Reservations List */}
 <div className="divide-y divide-[rgba(184,115,51,0.1)]">
 {filteredReservations.length === 0 ? (
 <div className="p-12 text-center text-[#7A6B58]">
 <CalendarDays className="w-16 h-16 mx-auto mb-4 text-[#4A3828]" strokeWidth={1.5} />
 <p>Bu kategoride rezervasyon bulunmuyor.</p>
 </div>
 ) : (
 filteredReservations.map((reservation) => (
 <div
 key={reservation.id}
 className="p-6 hover:bg-[rgba(184,115,51,0.04)] transition-colors cursor-pointer"
 onClick={() => {
 setSelectedReservation(reservation);
 setShowModal(true);
 }}
 >
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div className="flex items-start gap-4">
 <div className="w-12 h-12 bg-[rgba(239,68,68,0.1)] rounded-sm flex items-center justify-center flex-shrink-0">
 <span className="text-lg font-bold text-red-600">
 {reservation.party_size}
 </span>
 </div>
 
 <div>
 <h3 className="font-semibold text-[#1F1410]">{reservation.customer_name}</h3>
 <p className="text-sm text-[#7A6B58]">
 {formatDate(reservation.reservation_date)} • {formatTime(reservation.reservation_time)}
 </p>
 <div className="flex items-center gap-2 mt-1">
 <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[reservation.status]}`}>
 {STATUS_LABELS[reservation.status]}
 </span>
 {reservation.occasion && (
 <span className="text-xs text-[#7A6B58]">
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
 className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-sm hover:bg-green-700 transition-colors"
 >
 Onayla
 </button>
 <button
 onClick={(e) => {
 e.stopPropagation();
 updateStatus(reservation.id, 'cancelled');
 }}
 className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-sm hover:bg-red-700 transition-colors"
 >
 Reddet
 </button>
 </>
 )}
 <span className="text-sm text-[#4A3828]">
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
 <div className="bg-[var(--bg-card)] rounded-sm max-w-lg w-full max-h-[90vh] overflow-y-auto">
 <div className="p-6 border-b border-[rgba(184,115,51,0.14)] flex items-center justify-between">
 <h3 className="text-lg font-semibold text-[#1F1410]">Rezervasyon Detayı</h3>
 <button
 onClick={() => setShowModal(false)}
 className="text-[#4A3828] hover:text-[#7A6B58]"
 >
 <X className="w-6 h-6" />
 </button>
 </div>

 <div className="p-6 space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div className="bg-[rgba(184,115,51,0.04)] p-3 rounded-sm">
 <p className="text-xs text-[#7A6B58]">Müşteri</p>
 <p className="font-medium text-[#1F1410]">{selectedReservation.customer_name}</p>
 </div>
 <div className="bg-[rgba(184,115,51,0.04)] p-3 rounded-sm">
 <p className="text-xs text-[#7A6B58]">Telefon</p>
 <p className="font-medium text-[#1F1410]">{selectedReservation.customer_phone}</p>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div className="bg-[rgba(184,115,51,0.04)] p-3 rounded-sm">
 <p className="text-xs text-[#7A6B58]">Tarih</p>
 <p className="font-medium text-[#1F1410]">{formatDate(selectedReservation.reservation_date)}</p>
 </div>
 <div className="bg-[rgba(184,115,51,0.04)] p-3 rounded-sm">
 <p className="text-xs text-[#7A6B58]">Saat</p>
 <p className="font-medium text-[#1F1410]">{formatTime(selectedReservation.reservation_time)}</p>
 </div>
 </div>

 <div className="bg-[rgba(184,115,51,0.04)] p-3 rounded-sm">
 <p className="text-xs text-[#7A6B58]">Kişi Sayısı</p>
 <p className="font-medium text-[#1F1410]">{selectedReservation.party_size} kişi</p>
 </div>

 {selectedReservation.special_requests && (
 <div className="bg-[rgba(184,115,51,0.04)] p-3 rounded-sm">
 <p className="text-xs text-[#7A6B58]">Özel İstekler</p>
 <p className="text-[#1F1410]">{selectedReservation.special_requests}</p>
 </div>
 )}

 {selectedReservation.occasion && (
 <div className="bg-[rgba(184,115,51,0.04)] p-3 rounded-sm">
 <p className="text-xs text-[#7A6B58]">Özel Durum</p>
 <p className="text-[#1F1410]">{selectedReservation.occasion}</p>
 </div>
 )}

 <div className="bg-[rgba(184,115,51,0.04)] p-3 rounded-sm">
 <p className="text-xs text-[#7A6B58]">Onay Kodu</p>
 <p className="font-mono text-lg font-bold text-red-600">#{selectedReservation.confirmation_code}</p>
 </div>

 {/* Status Actions */}
 <div className="pt-4 border-t border-[rgba(184,115,51,0.14)]">
 <p className="text-sm font-medium text-[#7A6B58] mb-3">Durum Güncelle</p>
 <div className="flex flex-wrap gap-2">
 {Object.entries(STATUS_LABELS).map(([status, label]) => (
 <button
 key={status}
 onClick={() => updateStatus(selectedReservation.id, status)}
 disabled={selectedReservation.status === status}
 className={`px-3 py-1.5 rounded-sm text-sm font-medium transition-colors ${
 selectedReservation.status === status
 ? 'bg-[rgba(184,115,51,0.06)] text-[#4A3828] cursor-not-allowed'
 : STATUS_COLORS[status as keyof typeof STATUS_COLORS].replace('bg-', 'hover:bg-').replace('text-', 'hover:text-') + ' bg-[rgba(184,115,51,0.04)] text-[#7A6B58]'
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
