/**
 * Notification Preferences Manager Component
 * Manage notification settings by type
 */
import React, { useState } from 'react';
import { Settings, AlertCircle, Loader, CheckCircle } from 'lucide-react';

interface NotificationType {
  key: string;
  label: string;
  description: string;
}

const NOTIFICATION_TYPES: NotificationType[] = [
  { key: 'message', label: 'Yeni Mesajlar', description: 'Kullanıcılardan mesaj aldığında' },
  { key: 'review', label: 'Yorum Bildirimleri', description: 'İncelemelerinize yorum yazıldığında' },
  { key: 'like', label: 'Beğeni Bildirimleri', description: 'İçeriğiniz beğenildiğinde' },
  { key: 'follow', label: 'Takip Bildirimleri', description: 'Birisi sizi takip ettiğinde' },
  { key: 'mention', label: 'Bahsedilme Bildirimleri', description: 'Bahsedildiğinizde' },
  { key: 'marketing', label: 'Pazarlama E-postaları', description: 'Özel teklifler ve haberler' }
];

interface PreferencesState {
  [key: string]: {
    inAppEnabled: boolean;
    pushEnabled: boolean;
    emailEnabled: boolean;
    frequency: string;
  };
}

export default function NotificationPreferencesManager() {
  const [preferences, setPreferences] = useState<PreferencesState>(
    NOTIFICATION_TYPES.reduce((acc, type) => ({
      ...acc,
      [type.key]: {
        inAppEnabled: true,
        pushEnabled: true,
        emailEnabled: false,
        frequency: 'immediate'
      }
    }), {})
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savingType, setSavingType] = useState<string | null>(null);

  const handleToggle = (type: string, channel: 'inAppEnabled' | 'pushEnabled' | 'emailEnabled') => {
    setPreferences(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [channel]: !prev[type][channel]
      }
    }));
  };

  const handleFrequencyChange = (type: string, frequency: string) => {
    setPreferences(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        frequency
      }
    }));
  };

  const savePreferences = async (notificationType: string) => {
    try {
      setSavingType(notificationType);
      setError(null);
      setSuccess(null);

      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationType,
          preferences: preferences[notificationType]
        })
      });

      const json = await res.json();
      if (json.success) {
        setSuccess('Tercihler kaydedildi');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(json.error || 'Kaydedilirken hata oluştu');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu');
    } finally {
      setSavingType(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Bildirim Tercihleri</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}

      {/* Preferences Cards */}
      <div className="space-y-4">
        {NOTIFICATION_TYPES.map((type) => (
          <div key={type.key} className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-1">{type.label}</h3>
            <p className="text-sm text-gray-600 mb-4">{type.description}</p>

            {/* Channels */}
            <div className="space-y-3 mb-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences[type.key].inAppEnabled}
                  onChange={() => handleToggle(type.key, 'inAppEnabled')}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Uygulamada bildir</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences[type.key].pushEnabled}
                  onChange={() => handleToggle(type.key, 'pushEnabled')}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Push bildirimi gönder</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences[type.key].emailEnabled}
                  onChange={() => handleToggle(type.key, 'emailEnabled')}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">E-posta gönder</span>
              </label>
            </div>

            {/* Frequency */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Sıklık
              </label>
              <select
                value={preferences[type.key].frequency}
                onChange={(e) => handleFrequencyChange(type.key, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="immediate">Anlık</option>
                <option value="daily">Günlük özet</option>
                <option value="weekly">Haftalık özet</option>
                <option value="never">Hiçbir zaman</option>
              </select>
            </div>

            {/* Save Button */}
            <button
              onClick={() => savePreferences(type.key)}
              disabled={savingType === type.key}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm flex items-center justify-center gap-2"
            >
              {savingType === type.key ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                'Kaydet'
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
