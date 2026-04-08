import React, { useState, useEffect } from 'react';

export default function NotificationsCenter() {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, [filter]);

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?filter=' + filter + '&limit=50');
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      setNotifications(data.data || []);
    } catch (err) {
      console.error('Error loading notifications', err);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await fetch('/api/notifications/' + notificationId, { method: 'PATCH' });
      await loadNotifications();
    } catch (err) {
      console.error('Error marking as read', err);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await fetch('/api/notifications/' + notificationId, { method: 'DELETE' });
      await loadNotifications();
    } catch (err) {
      console.error('Error deleting notification', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      await loadNotifications();
    } catch (err) {
      console.error('Error marking all as read', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Bildirimler</h2>
        {notifications.length > 0 && (
          <button onClick={markAllAsRead} className="text-sm text-blue-600 hover:text-blue-700">
            Tümünü Oku
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'px-4 py-2 bg-blue-500 text-white rounded' : 'px-4 py-2 border border-gray-300 rounded hover:bg-gray-50'}
        >
          Tümü
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={filter === 'unread' ? 'px-4 py-2 bg-blue-500 text-white rounded' : 'px-4 py-2 border border-gray-300 rounded hover:bg-gray-50'}
        >
          Okunmamış
        </button>
      </div>

      {isLoading ? (
        <p className="text-center text-gray-600">Yükleniyor...</p>
      ) : notifications.length === 0 ? (
        <p className="text-center text-gray-500">Bildirim yok</p>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div key={notif.id} className={`p-4 rounded-lg border ${notif.read_at ? 'bg-gray-50 dark:bg-gray-700 border-gray-200' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200'}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{notif.type}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{notif.message}</p>
                  <p className="text-xs text-gray-500 mt-2">{new Date(notif.created_at).toLocaleDateString('tr-TR')}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  {!notif.read_at && (
                    <button
                      onClick={() => markAsRead(notif.id)}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Oku
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notif.id)}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Sil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
