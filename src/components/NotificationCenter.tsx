/**
 * Notification Center Component
 * Displays user notifications with read/archive actions
 */
import React, { useState, useEffect } from 'react';
import { Bell, Archive, Trash2, AlertCircle, Loader } from 'lucide-react';

interface Notification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  is_archived: boolean;
  created_at: string;
  action_url?: string;
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, [showArchived]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/notifications/center?archived=${showArchived}`);
      const json = await res.json();

      if (!json.success) {
        setError(json.error || 'Bildirimler alınırken hata oluştu');
        return;
      }

      setNotifications(json.data.notifications || []);
      setUnreadCount(json.data.unreadCount || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      setActionInProgress(notificationId);
      const res = await fetch('/api/notifications/center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read', notificationId })
      });

      const json = await res.json();
      if (json.success) {
        await fetchNotifications();
      } else {
        setError(json.error || 'İşlem başarısız');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleArchive = async (notificationId: string) => {
    try {
      setActionInProgress(notificationId);
      const res = await fetch('/api/notifications/center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive', notificationId })
      });

      const json = await res.json();
      if (json.success) {
        await fetchNotifications();
      } else {
        setError(json.error || 'İşlem başarısız');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu');
    } finally {
      setActionInProgress(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900">Hata</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Header and Tabs */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Bildirimler</h1>
          {!showArchived && unreadCount > 0 && (
            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* Archive Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowArchived(false)}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            !showArchived
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Geçerli
        </button>
        <button
          onClick={() => setShowArchived(true)}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            showArchived
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Arşiv
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>{showArchived ? 'Arşivlenmiş bildirim yok' : 'Yeni bildiriminiz yok'}</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`border rounded-lg p-4 flex items-start justify-between gap-4 ${
                notif.is_read
                  ? 'bg-white border-gray-200'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex-1 min-w-0">
                <h3 className={`font-semibold text-gray-900 ${!notif.is_read ? 'font-bold' : ''}`}>
                  {notif.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(notif.created_at).toLocaleDateString('tr-TR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!notif.is_read && !showArchived && (
                  <button
                    onClick={() => handleMarkAsRead(notif.id)}
                    disabled={actionInProgress === notif.id}
                    className="p-2 hover:bg-gray-200 rounded-lg disabled:opacity-50 transition-colors"
                    title="Okundu işaretle"
                  >
                    {actionInProgress === notif.id ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Bell className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => handleArchive(notif.id)}
                  disabled={actionInProgress === notif.id}
                  className="p-2 hover:bg-gray-200 rounded-lg disabled:opacity-50 transition-colors"
                  title={showArchived ? 'Sil' : 'Arşivle'}
                >
                  {actionInProgress === notif.id ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Archive className="w-4 h-4 text-gray-600" />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
