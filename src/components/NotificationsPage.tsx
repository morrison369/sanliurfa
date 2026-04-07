import React, { useState } from 'react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Yeni yorum',
      message: 'Göbeklitepe\'ye yapılan yorumunuza yeni cevap geldi',
      type: 'info',
      read: false,
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      title: 'Favori güncelleme',
      message: 'Balıklıgöl hakkında yeni içerik eklendi',
      type: 'success',
      read: false,
      createdAt: new Date(Date.now() - 3600000).toISOString()
    }
  ]);

  const filtered = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  return (
    <div className="container-custom py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bildirimler</h1>
          {unreadCount > 0 && (
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {unreadCount} okunmamış bildirim
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Tümünü Oku
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            filter === 'all'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
          }`}
        >
          Tümü ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            filter === 'unread'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
          }`}
        >
          Okunmamış ({unreadCount})
        </button>
      </div>

      {/* Notifications */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-lg border transition-colors ${
                notif.read
                  ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className={`font-semibold mb-1 ${notif.read ? 'text-gray-700 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                    {notif.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-500 mb-2">
                    {notif.message}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-600">
                    {new Date(notif.createdAt).toLocaleString('tr-TR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!notif.read && (
                    <button
                      onClick={() => markAsRead(notif.id)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                    >
                      Oku
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notif.id)}
                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    Sil
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-gray-600 dark:text-gray-400">
            <p className="text-lg mb-2">📭</p>
            <p className="text-lg font-medium mb-1">Bildirim yok</p>
            <p className="text-sm">Yeni bildirimler burada görünecek</p>
          </div>
        )}
      </div>
    </div>
  );
}
