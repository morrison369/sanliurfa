import React, { useState, useEffect } from 'react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'action';
  actionUrl?: string;
  actionLabel?: string;
  read: boolean;
  createdAt: Date;
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadNotifications();
    // Poll for new notifications every 10 seconds
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=10');
      if (!res.ok) return;

      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.count || 0);
    } catch (error) {
      console.error('Failed to load notifications', error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, { method: 'PUT' });
      loadNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'PUT' });
      loadNotifications();
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, { method: 'DELETE' });
      loadNotifications();
    } catch (error) {
      console.error('Failed to delete notification', error);
    }
  };

  const typeClasses = {
    info: 'bg-blue-50 border-blue-200 text-blue-900',
    success: 'bg-green-50 border-green-200 text-green-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    error: 'bg-red-50 border-red-200 text-red-900',
    action: 'bg-purple-50 border-purple-200 text-purple-900'
  };

  const typeIconClasses = {
    info: 'text-blue-500',
    success: 'text-green-500',
    warning: 'text-amber-500',
    error: 'text-red-500',
    action: 'text-purple-500'
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative bg-white rounded-full shadow-lg p-3 hover:bg-gray-50 transition-colors border border-gray-200"
        aria-label="Bildirimler"
      >
        <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2a6 6 0 100 12A6 6 0 0010 2zM0 10a10 10 0 1120 0 10 10 0 01-20 0z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {Math.min(unreadCount, 9)}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 max-h-96 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Bildirimler</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Tümünü Oku
              </button>
            )}
          </div>

          {/* Notifications List */}
          {notifications.length > 0 ? (
            <div className="flex-1 overflow-y-auto">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 border-b border-gray-100 ${typeClasses[notif.type]}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-1">{notif.title}</h4>
                      <p className="text-sm mb-2 opacity-90">{notif.message}</p>
                      <div className="flex items-center gap-2">
                        {!notif.read && (
                          <button
                            onClick={() => handleMarkAsRead(notif.id)}
                            className="text-xs font-medium opacity-75 hover:opacity-100"
                          >
                            Oku
                          </button>
                        )}
                        {notif.actionUrl && notif.actionLabel && (
                          <a
                            href={notif.actionUrl}
                            className="text-xs font-medium underline hover:no-underline"
                          >
                            {notif.actionLabel}
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(notif.id)}
                      className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm p-8">
              Bildirim yok
            </div>
          )}

          {/* Footer */}
          <div className="p-3 border-t border-gray-200">
            <a href="/notifications" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Tüm bildirimleri görüntüle →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
