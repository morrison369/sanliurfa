import React, { useState, useEffect } from 'react';

export default function MyActivityLog() {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const response = await fetch('/api/feed?type=personal&limit=50');
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      setActivities(data.data || []);
    } catch (err) {
      console.error('Error', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="text-center py-8">Yukleniyor...</div>;

  const getActivityIcon = (type) => {
    const icons = {
      'review_created': '⭐',
      'favorite_added': '❤️',
      'comment_posted': '💬',
      'collection_created': '📚',
      'user_followed': '👥'
    };
    return icons[type] || '📌';
  };

  const getActivityText = (type) => {
    const texts = {
      'review_created': 'Inceleme yazdin',
      'favorite_added': 'Favorilere ekledi',
      'comment_posted': 'Yorum yaptin',
      'collection_created': 'Koleksiyon olusturdu',
      'user_followed': 'Kullanici takip ettin'
    };
    return texts[type] || 'Aktivite';
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Benim Aktiviteleri</h2>

      {activities.length === 0 ? (
        <p className="text-center text-gray-600 py-8">Henuz aktivite yok</p>
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => (
            <div key={activity.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getActivityIcon(activity.actionType)}</span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {getActivityText(activity.actionType)}
                  </p>
                  {activity.metadata?.placeName && (
                    <p className="text-sm text-gray-600">
                      {activity.metadata.placeName}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(activity.createdAt).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
