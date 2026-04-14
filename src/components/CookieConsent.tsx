/**
 * Cookie Consent & GDPR Banner
 * EU GDPR compliant cookie consent management
 */

import { useState, useEffect, useCallback } from 'react';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

const STORAGE_KEY = 'cookie-consent';

const defaultPreferences: CookiePreferences = {
  necessary: true, // Always required
  analytics: false,
  marketing: false,
  functional: false,
};

/**
 * Get stored preferences
 */
function getStoredPreferences(): CookiePreferences | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Store preferences
 */
function storePreferences(preferences: CookiePreferences): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (e) {
    console.error('Failed to store cookie preferences:', e);
  }
}

/**
 * Cookie Consent Hook
 */
export function useCookieConsent() {
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences);
  const [showBanner, setShowBanner] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const stored = getStoredPreferences();
    if (stored) {
      setPreferences(stored);
    } else {
      setShowBanner(true);
    }
    setIsReady(true);
  }, []);

  const acceptAll = useCallback(() => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true,
    };
    setPreferences(allAccepted);
    storePreferences(allAccepted);
    setShowBanner(false);
    
    // Trigger analytics initialization
    window.dispatchEvent(new CustomEvent('cookieConsentChanged', { detail: allAccepted }));
  }, []);

  const acceptNecessary = useCallback(() => {
    setPreferences(defaultPreferences);
    storePreferences(defaultPreferences);
    setShowBanner(false);
    
    window.dispatchEvent(new CustomEvent('cookieConsentChanged', { detail: defaultPreferences }));
  }, []);

  const savePreferences = useCallback((newPreferences: CookiePreferences) => {
    setPreferences(newPreferences);
    storePreferences(newPreferences);
    setShowBanner(false);
    
    window.dispatchEvent(new CustomEvent('cookieConsentChanged', { detail: newPreferences }));
  }, []);

  const openSettings = useCallback(() => {
    setShowBanner(true);
  }, []);

  const hasConsent = useCallback((type: keyof CookiePreferences) => {
    return preferences[type];
  }, [preferences]);

  return {
    preferences,
    showBanner,
    isReady,
    acceptAll,
    acceptNecessary,
    savePreferences,
    openSettings,
    hasConsent,
  };
}

/**
 * Cookie Consent Banner Component
 */
export function CookieConsentBanner() {
  const { 
    preferences, 
    showBanner, 
    acceptAll, 
    acceptNecessary, 
    savePreferences 
  } = useCookieConsent();
  
  const [showDetails, setShowDetails] = useState(false);
  const [tempPreferences, setTempPreferences] = useState(preferences);

  if (!showBanner) return null;

  const handleSavePreferences = () => {
    savePreferences(tempPreferences);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {!showDetails ? (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Çerez Tercihleri
              </h3>
              <p className="text-gray-600 text-sm">
                Size daha iyi bir deneyim sunmak için çerezleri kullanıyoruz. 
                Gerekli çerezler hariç tercihlerinizi yönetebilirsiniz. 
                <a href="/cerez-politikasi" className="text-primary-600 hover:underline ml-1">
                  Daha fazla bilgi
                </a>
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowDetails(true)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium text-sm"
              >
                Ayarları Yönet
              </button>
              <button
                onClick={acceptNecessary}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm"
              >
                Sadece Gerekli
              </button>
              <button
                onClick={acceptAll}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium text-sm"
              >
                Tümünü Kabul Et
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Çerez Tercihlerinizi Yönetin
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Necessary Cookies */}
              <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">Zorunlu Çerezler</h4>
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded">
                      Zorunlu
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Sitenin düzgün çalışması için gerekli çerezler. Bu çerezler devre dışı bırakılamaz.
                  </p>
                </div>
                <div className="ml-4">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="w-5 h-5 text-primary-600 rounded"
                  />
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="flex items-start justify-between p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Analitik Çerezler</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Ziyaretçi davranışlarını anlamak ve site performansını ölçmek için kullanılır.
                  </p>
                </div>
                <div className="ml-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tempPreferences.analytics}
                      onChange={(e) => setTempPreferences(prev => ({ ...prev, analytics: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>

              {/* Functional Cookies */}
              <div className="flex items-start justify-between p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Fonksiyonel Çerezler</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Dil tercihleri ve oturum bilgileri gibi kullanıcı tercihlerini hatırlamak için kullanılır.
                  </p>
                </div>
                <div className="ml-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tempPreferences.functional}
                      onChange={(e) => setTempPreferences(prev => ({ ...prev, functional: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>

              {/* Marketing Cookies */}
              <div className="flex items-start justify-between p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Pazarlama Çerezleri</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Size ilgi alanlarınıza göre reklamlar göstermek için kullanılır.
                  </p>
                </div>
                <div className="ml-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tempPreferences.marketing}
                      onChange={(e) => setTempPreferences(prev => ({ ...prev, marketing: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
              >
                İptal
              </button>
              <button
                onClick={handleSavePreferences}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
              >
                Tercihleri Kaydet
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Cookie Settings Button
 */
export function CookieSettingsButton() {
  const { openSettings } = useCookieConsent();

  return (
    <button
      onClick={openSettings}
      className="text-gray-600 hover:text-gray-900 text-sm underline"
    >
      Çerez Ayarları
    </button>
  );
}

export default CookieConsentBanner;
