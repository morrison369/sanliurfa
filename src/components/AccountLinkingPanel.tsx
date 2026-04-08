/**
 * Account Linking Panel
 * Shows connected OAuth providers and allows linking/unlinking
 */

import React, { useState, useEffect } from 'react';
import { Trash2, Plus } from 'lucide-react';

interface LinkedProvider {
  provider: string;
  linked: boolean;
  icon: string;
  label: string;
}

interface AccountLinkingPanelProps {
  userId?: string;
}

export default function AccountLinkingPanel({ userId }: AccountLinkingPanelProps) {
  const [providers, setProviders] = useState<LinkedProvider[]>([
    { provider: 'google', linked: false, icon: '🔵', label: 'Google' },
    { provider: 'facebook', linked: false, icon: '📘', label: 'Facebook' },
    { provider: 'github', linked: false, icon: '⚫', label: 'GitHub' }
  ]);
  const [loading, setLoading] = useState(true);
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await fetch('/api/user/profile');
        if (!response.ok) return;

        const user = await response.json();

        setProviders(providers.map(p => ({
          ...p,
          linked: !!user.data[`${p.provider}_id`]
        })));
      } catch (error) {
        console.error('Failed to fetch user providers', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, []);

  const handleLink = (provider: string) => {
    window.location.href = `/api/auth/oauth/link?provider=${provider}`;
  };

  const handleUnlink = async (provider: string) => {
    if (!window.confirm(`${provider} hesabınızın bağlantısını kaldırmak istediğinize emin misiniz?`)) {
      return;
    }

    setUnlinkingProvider(provider);
    try {
      const response = await fetch(`/api/auth/oauth/unlink?provider=${provider}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setProviders(providers.map(p =>
          p.provider === provider ? { ...p, linked: false } : p
        ));
      } else {
        alert('Bağlantı kaldırılırken hata oluştu');
      }
    } catch (error) {
      console.error('Unlink failed', error);
      alert('Bağlantı kaldırılırken hata oluştu');
    } finally {
      setUnlinkingProvider(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          💡 Birden fazla giriş yöntemi bağlayarak hesabınızı daha güvenli hale getirin. Her zaman en az bir giriş yönteminiz olması gerekir.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {providers.map(provider => (
          <div key={provider.provider} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{provider.icon}</span>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">{provider.label}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {provider.linked ? 'Bağlı' : 'Bağlı değil'}
                </p>
              </div>
            </div>

            {provider.linked ? (
              <button
                onClick={() => handleUnlink(provider.provider)}
                disabled={unlinkingProvider === provider.provider}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Bağlantıyı Kaldır
              </button>
            ) : (
              <button
                onClick={() => handleLink(provider.provider)}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
                Bağla
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
