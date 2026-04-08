/**
 * Moderation Queue Manager Component
 * Manage pending moderation items
 */
import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, Loader } from 'lucide-react';

interface QueueItem {
  id: string;
  queue_type: string;
  item_type: string;
  item_id: string;
  priority: string;
  reason: string;
  submitted_count: number;
  last_reported_at: string;
  assigned_to_admin_id: string | null;
  status: string;
  created_at: string;
}

export default function ModerationQueueManager() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [status, setStatus] = useState('pending');

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/moderation/queue?status=${status}&limit=20`);
      const json = await res.json();

      if (!json.success) {
        setError(json.error || 'Moderasyon kuyruğu alınırken hata oluştu');
        return;
      }

      setItems(json.data.items || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [status]);

  const handleAssign = async (queueItemId: string) => {
    try {
      setActionInProgress(queueItemId);
      const res = await fetch('/api/admin/moderation/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueItemId, action: 'assign' })
      });

      const json = await res.json();
      if (json.success) {
        await fetchQueue();
      } else {
        setError(json.error || 'İşlem başarısız');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleResolve = async (queueItemId: string) => {
    try {
      setActionInProgress(queueItemId);
      const res = await fetch('/api/admin/moderation/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueItemId, action: 'resolve', resolution: 'resolved' })
      });

      const json = await res.json();
      if (json.success) {
        await fetchQueue();
      } else {
        setError(json.error || 'İşlem başarısız');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu');
    } finally {
      setActionInProgress(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900">Hata</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Status Filter */}
      <div className="flex gap-2">
        {['pending', 'in_review', 'resolved'].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              status === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {s === 'pending' ? 'Beklemede' : s === 'in_review' ? 'İncelemede' : 'Çözüldü'}
          </button>
        ))}
      </div>

      {/* Queue Items */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Kuyruk boş</div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-gray-200 rounded-lg p-4 flex items-start justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-900">{item.queue_type}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      item.priority === 'high'
                        ? 'bg-red-100 text-red-700'
                        : item.priority === 'medium'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {item.priority === 'high' ? 'Yüksek' : item.priority === 'medium' ? 'Orta' : 'Düşük'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1">{item.reason}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{item.submitted_count} bildirim</span>
                  <span>{new Date(item.created_at).toLocaleDateString('tr-TR')}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleAssign(item.id)}
                      disabled={actionInProgress === item.id}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {actionInProgress === item.id ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                      Ata
                    </button>
                    <button
                      onClick={() => handleResolve(item.id)}
                      disabled={actionInProgress === item.id}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {actionInProgress === item.id ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Çöz
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
