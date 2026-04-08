import React, { useState, useEffect } from 'react';
import { realtimeManager } from '../lib/realtime-sse';

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
      realtimeManager.connectToMessages();

      const unsubscribe = realtimeManager.subscribeToUnreadCount(count => {
        setUnreadCount(count);
        setIsConnected(true);
      });

      return () => {
        unsubscribe();
      };
    }
  }, [userId]);

  if (!userId && !showOnlineCount) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {/* Unread Messages Badge */}
      {userId && unreadCount > 0 && (
        <div className="relative inline-block">
          <a
            href="/mesajlar"
            className="inline-block relative text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            title="Okunmamış mesajlar"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
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
