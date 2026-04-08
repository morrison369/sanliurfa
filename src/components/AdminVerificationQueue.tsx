/**
 * Admin Verification Queue Component
 * Shows pending verification requests for admin review
 */

import React, { useState, useEffect } from 'react';

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
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<{ [key: string]: string }>({});
  const [showRejectForm, setShowRejectForm] = useState<string | null>(null);

  useEffect(() => {
    fetchVerifications();
  }, []);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/verifications?limit=50');

      if (!response.ok) {
        throw new Error('Failed to fetch verifications');
      }

      const data = await response.json();
      setVerifications(data.verifications || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
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
        throw new Error('Failed to approve verification');
      }

      // Remove from list
      setVerifications(verifications.filter(v => v.id !== verificationId));
      onRefresh?.();
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (verificationId: string) => {
    const reason = rejectReason[verificationId];
    if (!reason || reason.trim().length < 10) {
      alert('Lütfen reddetme nedenini en az 10 karakter giriniz.');
      return;
    }

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
        throw new Error('Failed to reject verification');
      }

      // Remove from list
      setVerifications(verifications.filter(v => v.id !== verificationId));
      setShowRejectForm(null);
      onRefresh?.();
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (verifications.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Bekleme listesinde doğrulama talebesi yok.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {verifications.map(verification => (
        <div
          key={verification.id}
          className="bg-white border border-gray-200 rounded-lg p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="font-semibold text-gray-900">{verification.placeName}</h4>
              <p className="text-sm text-gray-600 mt-1">
                Kategori: {verification.category} • Rating: {verification.rating.toFixed(1)}⭐
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Talep Tarihi: {new Date(verification.requestedAt).toLocaleDateString('tr-TR')}
              </p>
            </div>
          </div>

          {showRejectForm === verification.id ? (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reddetme Nedeni (Minimum 10 karakter)
              </label>
              <textarea
                value={rejectReason[verification.id] || ''}
                onChange={(e) => setRejectReason({
                  ...rejectReason,
                  [verification.id]: e.target.value
                })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                placeholder="Reddetme nedenini açıklayın..."
              />
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              onClick={() => handleApprove(verification.id)}
              disabled={processingId === verification.id}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {processingId === verification.id ? '⏳' : '✓'} Onayla
            </button>
            {showRejectForm === verification.id ? (
              <>
                <button
                  onClick={() => handleReject(verification.id)}
                  disabled={processingId === verification.id}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {processingId === verification.id ? '⏳' : '✗'} Reddet
                </button>
                <button
                  onClick={() => setShowRejectForm(null)}
                  disabled={processingId === verification.id}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm font-medium rounded-lg transition-colors"
                >
                  İptal
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowRejectForm(verification.id)}
                disabled={processingId === verification.id}
                className="px-4 py-2 bg-red-100 hover:bg-red-200 disabled:bg-gray-200 text-red-700 text-sm font-medium rounded-lg transition-colors"
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
