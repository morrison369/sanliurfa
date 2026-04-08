import React, { useState, useEffect } from 'react';

interface SearchHistoryItem {
  id: string;
  query: string;
  filters?: any;
  results_count: number;
  created_at: string;
}

interface SearchHistoryViewerProps {
  limit?: number;
}

export default function SearchHistoryViewer({ limit = 20 }: SearchHistoryViewerProps) {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/search/history');

      if (!response.ok) {
        throw new Error('Arama geçmişi yüklenemedi');
      }

      const data = await response.json();
      setHistory(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRepeatSearch = (item: SearchHistoryItem) => {
    const params = new URLSearchParams();
    params.set('q', item.query);
    if (item.filters) {
      params.set('filters', JSON.stringify(item.filters));
    }
    window.location.href = `/arama?${params.toString()}`;
  };

  const handleDeleteItem = async (itemId: string) => {
    if (isDeletingId) return;

    setIsDeletingId(itemId);
    setError(null);

    try {
      const response = await fetch(`/api/search/history/${itemId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Silme işlemi başarısız');
      }

      setHistory(history.filter((h) => h.id !== itemId));
      setDeleteConfirmId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (isClearingAll) return;

    setIsClearingAll(true);
    setError(null);

    try {
      const response = await fetch('/api/search/history', {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Temizleme işlemi başarısız');
      }

      setHistory([]);
      setShowClearConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsClearingAll(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {history.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="mb-2">Arama geçmişi boş</p>
          <a href="/arama" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm">
            Arama yap
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Toplam {history.length} arama
            </p>
            {history.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
              >
                Geçmişi Temizle
              </button>
            )}
          </div>

          {history.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">
                    {item.query}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {item.results_count} sonuç
                  </p>

                  {item.filters && Object.keys(item.filters).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.entries(item.filters).map(([key, value]) => (
                        <span
                          key={key}
                          className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded"
                        >
                          {key}: {String(value)}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    {new Date(item.created_at).toLocaleDateString('tr-TR')} {new Date(item.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleRepeatSearch(item)}
                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Ara
                  </button>

                  {deleteConfirmId === item.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={isDeletingId === item.id}
                        className="px-2 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {isDeletingId === item.id ? '...' : 'Evet'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        disabled={isDeletingId === item.id}
                        className="px-2 py-2 bg-gray-400 text-white text-sm rounded-lg hover:bg-gray-500 disabled:opacity-50 transition-colors"
                      >
                        Hayır
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(item.id)}
                      className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      Sil
                    </button>
                  )}
                </div>
              </div>

              {deleteConfirmId === item.id && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  Silmek istediğinizden emin misiniz?
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Tüm Arama Geçmişini Temizle?
            </h2>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Bu işlem geri alınamaz. Tüm arama geçmişi silinecektir.
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleClearAll}
                disabled={isClearingAll}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isClearingAll ? 'Temizleniyor...' : 'Evet, Temizle'}
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearingAll}
                className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors font-medium"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
