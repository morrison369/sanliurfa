/**
 * Transaction History Component
 * Display user's loyalty transaction history
 */
import { useEffect, useState } from 'react';

interface Transaction {
  id: string;
  transaction_type: string;
  points_amount: number;
  transaction_reason: string;
  balance_before: number;
  balance_after: number;
  created_at: string;
  expires_at?: string;
  is_expired: boolean;
}

interface Pagination {
  limit: number;
  offset: number;
  total: number;
}

export function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    limit: 20,
    offset: 0,
    total: 0
  });
  const [selectedType, setSelectedType] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, [pagination.offset, selectedType]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString()
      });
      if (selectedType) {
        params.append('type', selectedType);
      }

      const res = await fetch(`/api/loyalty/transactions?${params}`);
      if (!res.ok) throw new Error('Failed to fetch transactions');

      const data = await res.json();
      setTransactions(data.data?.transactions || []);
      setPagination(data.data?.pagination || { limit: 20, offset: 0, total: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earn':
        return '✅';
      case 'spend':
        return '💰';
      case 'expire':
        return '⏰';
      case 'birthday_bonus':
        return '🎂';
      case 'annual_reset':
        return '🔄';
      default:
        return '•';
    }
  };

  const getTransactionColor = (type: string) => {
    if (type.includes('earn') || type.includes('bonus') || type.includes('reset')) {
      return 'text-green-600';
    } else if (type.includes('spend')) {
      return 'text-orange-600';
    } else {
      return 'text-gray-600';
    }
  };

  const types = Array.from(
    new Set(transactions.map((t) => t.transaction_type))
  ).sort();

  const pageCount = Math.ceil(pagination.total / pagination.limit);
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Type Filter */}
      {types.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setSelectedType('');
              setPagination({ ...pagination, offset: 0 });
            }}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
              selectedType === ''
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Tümü
          </button>
          {types.map((type) => (
            <button
              key={type}
              onClick={() => {
                setSelectedType(type);
                setPagination({ ...pagination, offset: 0 });
              }}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition capitalize ${
                selectedType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {type.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      )}

      {/* Transactions List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-16 animate-pulse"></div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">İşlem geçmişi yok.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className={`bg-white border rounded-lg p-4 ${tx.is_expired ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getTransactionIcon(tx.transaction_type)}</span>
                  <div>
                    <p className="font-semibold capitalize">{tx.transaction_reason}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(tx.created_at).toLocaleDateString('tr-TR')} {new Date(tx.created_at).toLocaleTimeString('tr-TR')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${getTransactionColor(tx.transaction_type)}`}>
                    {tx.points_amount > 0 ? '+' : '-'}{Math.abs(tx.points_amount)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {tx.balance_before} → {tx.balance_after}
                  </p>
                </div>
              </div>

              {tx.is_expired && (
                <p className="text-xs text-red-600 font-medium">Süresi dolmuş</p>
              )}
              {tx.expires_at && !tx.is_expired && (
                <p className="text-xs text-orange-600">
                  Sonu: {new Date(tx.expires_at).toLocaleDateString('tr-TR')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() =>
              setPagination({
                ...pagination,
                offset: Math.max(0, pagination.offset - pagination.limit)
              })
            }
            disabled={pagination.offset === 0}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
          >
            Önceki
          </button>

          <span className="text-sm text-gray-600">
            Sayfa {currentPage} / {pageCount} ({pagination.total} toplam)
          </span>

          <button
            onClick={() =>
              setPagination({
                ...pagination,
                offset: Math.min(
                  (pageCount - 1) * pagination.limit,
                  pagination.offset + pagination.limit
                )
              })
            }
            disabled={currentPage === pageCount}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
          >
            Sonraki
          </button>
        </div>
      )}
    </div>
  );
}
