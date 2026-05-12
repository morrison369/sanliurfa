/**
 * Admin Verification Queue Component
 * Shows pending verification requests for admin review
 */
import { useState, useEffect } from 'react';
interface VerificationRequest {
 id: string;
 placeId: string;
 placeName: string;
 category: string;
 rating: number;
 requestedAt: string;
 reason?: string;
}

interface AdminVerificationQueueProps {
 onRefresh?: () => void;
}

export function AdminVerificationQueue({ onRefresh }: AdminVerificationQueueProps) {
 const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [actionError, setActionError] = useState<string | null>(null);
 const [processingId, setProcessingId] = useState<string | null>(null);
 const [rejectReason, setRejectReason] = useState<{ [key: string]: string }>({});
 const [showRejectForm, setShowRejectForm] = useState<string | null>(null);
 const [rejectValidationError, setRejectValidationError] = useState<string | null>(null);

 useEffect(() => {
 fetchVerifications();
 }, []);

 const fetchVerifications = async () => {
 try {
 setLoading(true);
 const response = await fetch('/api/admin/verifications?limit=50');

 if (!response.ok) {
 throw new Error('Doğrulama kuyruğu yüklenemedi.');
 }

 const data = await response.json();
 setVerifications(data.verifications || []);
 setError(null);
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Bilinmeyen hata oluştu.');
 setVerifications([]);
 } finally {
 setLoading(false);
 }
 };

 const handleApprove = async (verificationId: string, reason?: string) => {
 setProcessingId(verificationId);

 try {
 const response = await fetch(`/api/admin/verifications/${verificationId}/approve`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json'
 },
 body: JSON.stringify({ reason: reason || '' })
 });

 if (!response.ok) {
 throw new Error('Doğrulama talebi onaylanamadı.');
 }

 // İşlenen talebi kuyruktan kaldır.
 setVerifications(verifications.filter(v => v.id !== verificationId));
 onRefresh?.();
 } catch (err) {
 setActionError(err instanceof Error ? err.message : 'Onaylama işlemi başarısız oldu.');
 } finally {
 setProcessingId(null);
 }
 };

 const handleReject = async (verificationId: string) => {
 const reason = rejectReason[verificationId];
 if (!reason || reason.trim().length < 10) {
 setRejectValidationError('Reddetme nedeni en az 10 karakter olmalıdır.');
 return;
 }
 setRejectValidationError(null);

 setProcessingId(verificationId);

 try {
 const response = await fetch(`/api/admin/verifications/${verificationId}/reject`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json'
 },
 body: JSON.stringify({ reason })
 });

 if (!response.ok) {
 throw new Error('Doğrulama talebi reddedilemedi.');
 }

 // İşlenen talebi kuyruktan kaldır.
 setVerifications(verifications.filter(v => v.id !== verificationId));
 setShowRejectForm(null);
 onRefresh?.();
 } catch (err) {
 setActionError(err instanceof Error ? err.message : 'Reddetme işlemi başarısız oldu.');
 } finally {
 setProcessingId(null);
 }
 };

 if (loading) {
 return (
 <div className="space-y-4">
 {[1, 2, 3].map(i => (
 <div key={i} className="h-24 bg-[rgba(184,115,51,0.08)] rounded animate-pulse" />
 ))}
 </div>
 );
 }

 if (error) {
 return (
 <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] rounded-sm">
 <p className="text-red-700">{error}</p>
 </div>
 );
 }

 if (verifications.length === 0) {
 return (
 <div className="text-center py-12">
 <p className="text-[#7A6B58]">Bekleme listesinde doğrulama talebi yok.</p>
 </div>
 );
 }

 return (
 <div className="space-y-4">
 {actionError && (
 <div className="p-3 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] rounded-sm flex items-center justify-between">
 <p className="text-red-700 text-sm">{actionError}</p>
 <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600 ml-4 text-lg leading-none">×</button>
 </div>
 )}
 {verifications.map(verification => (
 <div
 key={verification.id}
 className="bg-[var(--bg-card)] border border-[rgba(184,115,51,0.14)] rounded-sm p-6"
 >
 <div className="flex items-start justify-between mb-4">
 <div>
 <h4 className="font-semibold text-[#1F1410]">{verification.placeName}</h4>
 <p className="text-sm text-[#7A6B58] mt-1">
 Kategori: {verification.category} • Puan: {verification.rating.toFixed(1)}
 </p>
 <p className="text-xs text-[#7A6B58] mt-2">
 Talep Tarihi: {new Date(verification.requestedAt).toLocaleDateString('tr-TR')}
 </p>
 </div>
 </div>

 {showRejectForm === verification.id ? (
 <div className="mb-4 p-4 bg-[rgba(184,115,51,0.04)] rounded-sm border border-[rgba(184,115,51,0.14)]">
 <label className="block text-sm font-medium text-[#7A6B58] mb-2">
 Reddetme Nedeni (Minimum 10 karakter)
 </label>
 <textarea
 value={rejectReason[verification.id] || ''}
 onChange={(e) => {
 setRejectReason({ ...rejectReason, [verification.id]: e.target.value });
 if (rejectValidationError) setRejectValidationError(null);
 }}
 rows={3}
 className={`w-full px-3 py-2 border rounded-sm text-sm focus:outline-none focus:border-[rgba(184,115,51,0.6)] ${rejectValidationError ? 'border-red-400 bg-[rgba(239,68,68,0.1)]' : 'border-[rgba(184,115,51,0.25)]'}`}
 placeholder="Reddetme nedenini açıklayın..."
 />
 {rejectValidationError && (
 <p className="text-red-600 text-xs mt-1">{rejectValidationError}</p>
 )}
 </div>
 ) : null}

 <div className="flex gap-2">
 <button
 onClick={() => handleApprove(verification.id)}
 disabled={processingId === verification.id}
 className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-[rgba(184,115,51,0.2)] text-white text-sm font-medium rounded-sm transition-colors"
 >
 {processingId === verification.id ? '⏳' : '✓'} Onayla
 </button>
 {showRejectForm === verification.id ? (
 <>
 <button
 onClick={() => handleReject(verification.id)}
 disabled={processingId === verification.id}
 className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-[rgba(184,115,51,0.2)] text-white text-sm font-medium rounded-sm transition-colors"
 >
 {processingId === verification.id ? '⏳' : '✗'} Reddet
 </button>
 <button
 onClick={() => setShowRejectForm(null)}
 disabled={processingId === verification.id}
 className="px-4 py-2 bg-[rgba(184,115,51,0.12)] hover:bg-[rgba(184,115,51,0.2)] text-[#1F1410] text-sm font-medium rounded-sm transition-colors"
 >
 İptal
 </button>
 </>
 ) : (
 <button
 onClick={() => setShowRejectForm(verification.id)}
 disabled={processingId === verification.id}
 className="px-4 py-2 bg-[rgba(239,68,68,0.1)] hover:bg-[rgba(239,68,68,0.18)] disabled:bg-[rgba(184,115,51,0.08)] text-red-700 text-sm font-medium rounded-sm transition-colors"
 >
 Reddet
 </button>
 )}
 </div>
 </div>
 ))}
 </div>
 );
}
