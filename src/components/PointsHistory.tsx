import React, { useState, useEffect } from 'react';

export default function PointsHistory() {
  const [history, setHistory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/users/points-history');
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      setHistory(data.data);
    } catch (err) {
      console.error('Error', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="text-center py-8">Yukleniyor...</div>;
  if (!history) return <div>Veri yuklenemedi</div>;

  const getActivityIcon = (type) => {
    const icons = { 'review_created': '⭐', 'comment_posted': '💬', 'favorite_added': '❤️' };
    return icons[type] || '📌';
  };

  const getActivityLabel = (type) => {
    const labels = { 'review_created': 'Inceleme', 'comment_posted': 'Yorum', 'favorite_added': 'Favori' };
    return labels[type] || 'Aktivite';
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Puan Gecmisi</h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {history.summary.map((item) => (
          <div key={item.action_type} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">{getActivityLabel(item.action_type)}</p>
            <p className="text-2xl font-bold text-blue-600">{item.total_points}</p>
            <p className="text-xs text-gray-500">{item.count} kez</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {history.history.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-lg">{getActivityIcon(entry.action_type)}</span>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {getActivityLabel(entry.action_type)}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(entry.created_at).toLocaleDateString('tr-TR')}
                </p>
              </div>
            </div>
            <span className="text-sm font-bold text-blue-600">+{entry.points_earned || 10}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
