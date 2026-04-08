/**
 * RSVP Button Component
 * Toggle event attendance with visual feedback
 */

import React, { useState, useEffect } from 'react';

interface RsvpButtonProps {
  eventId: string;
  isLoggedIn: boolean;
  initialRsvpd?: boolean;
  attendeeCount?: number;
  capacity?: number;
  onRsvpChange?: (rsvpd: boolean) => void;
}

export function RsvpButton({
  eventId,
  isLoggedIn,
  initialRsvpd = false,
  attendeeCount = 0,
  capacity,
  onRsvpChange
}: RsvpButtonProps) {
  const [isRsvpd, setIsRsvpd] = useState(initialRsvpd);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFull = capacity && attendeeCount >= capacity;

  const handleRsvp = async () => {
    if (!isLoggedIn) {
      window.location.href = '/giris';
      return;
    }

    if (isFull && !isRsvpd) {
      setError('Etkinlik kapasitesi dolu');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'RSVP işlemi başarısız');
      }

      const data = await response.json();
      setIsRsvpd(data.rsvpd);
      onRsvpChange?.(data.rsvpd);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleRsvp}
        disabled={isLoading || (isFull && !isRsvpd)}
        className={`px-6 py-2 rounded-lg font-medium transition-colors ${
          isRsvpd
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white'
        }`}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin">⏳</span>
            {isRsvpd ? 'Çıkılıyor...' : 'Katılım sağlanıyor...'}
          </span>
        ) : isRsvpd ? (
          <span className="flex items-center gap-2">
            <span>✓</span>
            Katılımınız onaylandı
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span>+</span>
            Etkinliğe Katıl
          </span>
        )}
      </button>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {capacity && (
        <div className="text-xs text-gray-600">
          <div className="flex justify-between mb-1">
            <span>Katılımcılar</span>
            <span>{attendeeCount}/{capacity}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                Math.round((attendeeCount / capacity) * 100) < 80
                  ? 'bg-green-500'
                  : Math.round((attendeeCount / capacity) * 100) < 100
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${Math.min((attendeeCount / capacity) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
