import React, { useState, useEffect } from 'react';
import { setupInstallPrompt, isInstalledApp, requestNotificationPermission, subscribeToPush } from '../lib/pwa';

export default function PWAPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setIsInstalled(isInstalledApp());

    setupInstallPrompt(
      (prompt) => {
        setDeferredPrompt(prompt);
        setShowPrompt(true);
      },
      () => {
        setShowPrompt(false);
        setIsInstalled(true);
      }
    );

    // Hide if already installed
    if (isInstalledApp()) {
      setShowPrompt(false);
    }
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    (deferredPrompt as any).prompt?.();
    const { outcome } = await (deferredPrompt as any).userChoice;

    if (outcome === 'accepted') {
      setShowPrompt(false);
      setDeferredPrompt(null);

      // Request notification permission after installation
      setTimeout(async () => {
        const permission = await requestNotificationPermission();
        if (permission === 'granted') {
          // Get VAPID key and subscribe
          try {
            const vapidRes = await fetch('/api/notifications/vapid-key');
            const { vapidKey } = await vapidRes.json();
            if (vapidKey) {
              await subscribeToPush(vapidKey);
            }
          } catch (error) {
            console.warn('[PWA] Push subscription failed', error);
          }
        }
      }, 1000);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt || isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">
            Şanlıurfa'yı Kullan
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Ana ekrana ekleyerek daha hızlı erişim sağlayın ve çevrimdışı kullanın.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Ekle
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
            >
              Şimdi Değil
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
        >
          <span className="sr-only">Kapat</span>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
