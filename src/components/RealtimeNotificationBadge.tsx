import {  useState, useEffect  } from 'react';
import { Mail } from 'lucide-react';
import { realtimeManager } from '../lib/realtime/realtime-sse';

interface RealtimeNotificationBadgeProps {
  userId?: string;
  showOnlineCount?: boolean;
}

/**
 * Real-time notification badge that updates via SSE
 * Shows unread message count and optional online user count
 */
export default function RealtimeNotificationBadge({
  userId,
  showOnlineCount = false
}: RealtimeNotificationBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  const normalizeCount = (value: unknown): number => {
    if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
      return 0;
    }

    return value;
  };

  useEffect(() => {
    // Connect to presence SSE if showing online count
    if (showOnlineCount) {
      realtimeManager.connect();
      const unsubscribe = realtimeManager.subscribeToOnlineUsers(count => {
        setOnlineCount(count);
        setIsConnected(true);
      });

      return () => {
        unsubscribe();
      };
    }
  }, [showOnlineCount]);

  useEffect(() => {
    // Connect to messages SSE if user is authenticated
    if (userId) {
      const fetchUnreadCount = async () => {
        try {
          const response = await fetch('/api/messages/unread-count', {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
          });

          if (!response.ok) {
            return;
          }

          const payload = await response.json();
          if (
            typeof payload?.data?.count === 'number' &&
            Number.isFinite(payload.data.count)
          ) {
            setUnreadCount(normalizeCount(payload.data.count));
          }
        } catch {
          // Polling fallback failure should not break SSE flow
        }
      };

      fetchUnreadCount();

      realtimeManager.connectToMessages();
      const poller = setInterval(fetchUnreadCount, 30000);

      const unsubscribe = realtimeManager.subscribeToUnreadCount(count => {
        setUnreadCount(normalizeCount(count));
        setIsConnected(true);
      });

      return () => {
        unsubscribe();
        clearInterval(poller);
      };
    }
  }, [userId]);

  if (!userId && !showOnlineCount) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {/* Unread Messages Badge */}
      {userId && (
        <div className="relative inline-block">
          <a
            href="/mesajlar"
            className="inline-block relative text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            title="Okunmamış mesajlar"
          >
            <Mail className="w-5 h-5" />
            {(unreadCount > 0 || isConnected) && (
              <span
                className={`absolute -top-2 -right-2 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold text-white ${
                  unreadCount > 0
                    ? 'bg-red-500'
                    : isConnected
                      ? 'bg-gray-400'
                      : 'bg-gray-400'
                }`}
              >
                {unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : '•'}
              </span>
            )}
          </a>
        </div>
      )}

      {/* Online Count Indicator */}
      {showOnlineCount && (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span>{onlineCount} çevrimiçi</span>
        </div>
      )}
    </div>
  );
}
