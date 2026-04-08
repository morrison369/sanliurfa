import React, { useState, useEffect } from 'react';

/**
 * Push Notification subscription manager
 */
export default function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkSubscriptionStatus();
    }
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Failed to check subscription:', error);
    }
  };

  const handleToggleNotifications = async () => {
    try {
      setIsLoading(true);

      if (isSubscribed) {
        // Unsubscribe
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          await fetch('/api/notifications/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: subscription.endpoint })
          });

          await subscription.unsubscribe();
          setIsSubscribed(false);
        }
      } else {
        // Subscribe
        const registration = await navigator.serviceWorker.ready;
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.PUBLIC_VAPID_KEY
          });

          const response = await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: subscription.toJSON() })
          });

          if (response.ok) {
            setIsSubscribed(true);
          }
        }
      }
    } catch (error) {
      console.error('Toggle notifications failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isSubscribed}
          onChange={handleToggleNotifications}
          disabled={isLoading}
          className="w-4 h-4"
        />
        <span className="text-sm font-medium">
          {isLoading ? 'İşleniyor...' : isSubscribed ? 'Bildirimler açık' : 'Bildirimleri aç'}
        </span>
      </label>
      <span className={`w-2 h-2 rounded-full ${isSubscribed ? 'bg-green-500' : 'bg-gray-300'}`} />
    </div>
  );
}
