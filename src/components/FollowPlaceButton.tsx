import React, { useState, useEffect } from 'react';

interface FollowPlaceButtonProps {
  placeId: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function FollowPlaceButton({ placeId, onFollowChange }: FollowPlaceButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggleFollow = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const response = await fetch(`/api/places/${placeId}/follow`, { method });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'İşlem başarısız');
      }

      const newState = !isFollowing;
      setIsFollowing(newState);
      onFollowChange?.(newState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleToggleFollow}
        disabled={isLoading}
        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
          isFollowing
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isLoading
          ? 'İşleniyor...'
          : isFollowing
          ? '✓ Takip Ediliyor'
          : '+ Takip Et'}
      </button>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
