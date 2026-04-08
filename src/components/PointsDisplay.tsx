import React, { useState, useEffect } from 'react';

interface UserPoints {
  userId: string;
  totalPoints: number;
  lastUpdated: string;
}

export default function PointsDisplay() {
  const [points, setPoints] = useState<UserPoints | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPoints();
  }, []);

  const loadPoints = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/points?view=personal');

      if (!response.ok) {
        throw new Error('Puanlar yüklenemedi');
      }

      const data = await response.json();
      setPoints(data.points || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-16 rounded-lg"></div>
    );
  }

  if (error || !points) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-90">Toplam Puanlarınız</p>
          <p className="text-3xl font-bold">{points.totalPoints}</p>
        </div>
        <div className="text-4xl">⭐</div>
      </div>
      <p className="text-xs opacity-75 mt-2">
        Aktiviteleriniz için puan kazanın ve ödüller açın
      </p>
      <a
        href="/profil/puanlar"
        className="mt-3 inline-block text-sm font-medium hover:opacity-90 transition-opacity underline"
      >
        Detaylı görüntüle →
      </a>
    </div>
  );
}
