import React, { useState, useEffect } from 'react';

interface Log {
  id: string;
  event: string;
  status: string;
  responseCode?: number;
  responseTime?: number;
  errorMessage?: string;
  attempts: number;
  createdAt: string;
}

interface LogsProps {
  webhookId: string;
  token: string;
}

export default function WebhookDeliveryLogs({ webhookId, token }: LogsProps) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);

  const API_URL = '/api/webhooks/logs';

  useEffect(() => {
    loadLogs();
    loadSummary();
  }, [page]);

  const loadSummary = async () => {
    try {
      const res = await fetch(`${API_URL}?webhookId=${webhookId}&summary=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.data);
      }
    } catch (err) {
      console.error('Failed to load summary:', err);
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}?webhookId=${webhookId}&limit=${limit}&offset=${page * limit}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (!res.ok) throw new Error('Failed to load logs');
      const data = await res.json();
      setLogs(data.data);
      setTotal(data.pagination.total);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'delivered': return '✅ Teslim Edildi';
      case 'failed': return '❌ Başarısız';
      case 'pending': return '⏳ Bekleme';
      default: return status;
    }
  };

  const pages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Teslimat Geçmişi</h2>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Toplam</p>
            <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Teslim</p>
            <p className="text-2xl font-bold text-green-600">{summary.delivered}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Başarısız</p>
            <p className="text-2xl font-bold text-red-600">{summary.failed}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Bekleme</p>
            <p className="text-2xl font-bold text-yellow-600">{summary.pending}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Başarı Oranı</p>
            <p className={`text-2xl font-bold ${summary.successRate >= 95 ? 'text-green-600' : summary.successRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
              {summary.successRate}%
            </p>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-gray-700 font-semibold">Olay</th>
                <th className="px-4 py-3 text-left text-gray-700 font-semibold">Durum</th>
                <th className="px-4 py-3 text-left text-gray-700 font-semibold">Kod</th>
                <th className="px-4 py-3 text-left text-gray-700 font-semibold">Zaman</th>
                <th className="px-4 py-3 text-left text-gray-700 font-semibold">Denemeler</th>
                <th className="px-4 py-3 text-left text-gray-700 font-semibold">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Yükleniyor...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Henüz teslimat kaydı yok
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{log.event}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(log.status)}`}>
                        {getStatusLabel(log.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {log.responseCode ? (
                        <span className={log.responseCode >= 200 && log.responseCode < 300 ? 'text-green-600' : 'text-red-600'}>
                          {log.responseCode}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {log.responseTime ? `${log.responseTime}ms` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{log.attempts}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(log.createdAt).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-t">
            <p className="text-sm text-gray-600">
              Sayfa {page + 1} / {pages} ({total} toplam)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                ← Önceki
              </button>
              <button
                onClick={() => setPage(Math.min(pages - 1, page + 1))}
                disabled={page >= pages - 1}
                className="px-3 py-1 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Sonraki →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
