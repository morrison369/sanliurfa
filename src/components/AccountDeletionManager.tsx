import React, { useState, useEffect } from 'react';

interface DeletionStatus {
  hasPendingDeletion: boolean;
  deletesAt?: string;
  gracePeriodDaysRemaining?: number;
}

export default function AccountDeletionManager() {
  const [status, setStatus] = useState<DeletionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    checkDeletionStatus();
  }, []);

  const checkDeletionStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/users/deletion/status');

      if (!response.ok) {
        throw new Error('Status kontrol edilemedi');
      }

      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError('Şifre gerekli');
      return;
    }

    setIsDeletingAccount(true);

    try {
      const response = await fetch('/api/users/deletion/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, reason })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Silme isteği gönderilemedi');
      }

      const data = await response.json();
      setSuccessMessage(data.message);
      setShowDeleteModal(false);
      setPassword('');
      setReason('');
      await checkDeletionStatus();

      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleCancelDeletion = async () => {
    if (!confirm('Hesap silme işlemini iptal etmek istediğinizden emin misiniz?')) {
      return;
    }

    setIsCancelling(true);
    setError(null);

    try {
      const response = await fetch('/api/users/deletion/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'İptal edilemedi');
      }

      setSuccessMessage('Silme işlemi iptal edildi');
      await checkDeletionStatus();

      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsCancelling(false);
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

      {successMessage && (
        <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 text-sm">
          {successMessage}
        </div>
      )}

      {status?.hasPendingDeletion ? (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="mb-4">
            <h3 className="font-semibold text-red-900 dark:text-red-200 mb-2">Hesap Silme Beklemede</h3>
            <p className="text-sm text-red-800 dark:text-red-300 mb-4">
              Hesabınız{' '}
              <strong>
                {status.deletesAt ? new Date(status.deletesAt).toLocaleDateString('tr-TR') : '—'}
              </strong>{' '}
              tarihinde kalıcı olarak silinecektir.
            </p>
            <p className="text-sm text-red-800 dark:text-red-300 mb-4">
              <strong>{status.gracePeriodDaysRemaining} gün</strong> içinde bu işlemi iptal edebilirsiniz.
            </p>
          </div>

          <button
            onClick={handleCancelDeletion}
            disabled={isCancelling}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isCancelling ? 'İptal Ediliyor...' : 'Silmeyi İptal Et'}
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Hesabı Sil</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Hesabınızı silmek istiyorsanız, aşağıdaki butona tıklayın. Silme işlemi 7 gün sonra gerçekleşecektir ve bu süre içinde iptal edebilirsiniz.
          </p>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Hesabı Silmeyi İste
          </button>
        </div>
      )}

      {showDeleteModal && !status?.hasPendingDeletion && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Hesabı Sil</h2>

            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800 dark:text-red-300">
                <strong>Uyarı:</strong> Hesabınız 7 gün sonra kalıcı olarak silinecektir. Bu süre içinde iptal edebilirsiniz.
              </p>
            </div>

            <form onSubmit={handleRequestDeletion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Şifrenizi Girin
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Şifreniz"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                  disabled={isDeletingAccount}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Silme Sebebi (Opsiyonel)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Neden hesabınızı silmek istiyorsunuz?"
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  disabled={isDeletingAccount}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {reason.length}/500
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isDeletingAccount || !password}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isDeletingAccount ? 'Gönderiliyor...' : 'Silmeyi Onayla'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setPassword('');
                    setReason('');
                  }}
                  disabled={isDeletingAccount}
                  className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
