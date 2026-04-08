/**
 * Visitor Chart Component
 * Display visitor statistics in chart format
 */

import React, { useState, useEffect } from 'react';

interface VisitorStat {
  date: string;
  visitorCount: number;
  uniqueVisitors: number;
}

interface VisitorChartProps {
  placeId: string;
  startDate?: string;
  endDate?: string;
}

export function VisitorChart({ placeId, startDate, endDate }: VisitorChartProps) {
  const [stats, setStats] = useState<VisitorStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const response = await fetch(
          `/api/owner/analytics/visitors/${placeId}?${params}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch visitor stats');
        }

        const data = await response.json();
        setStats(data.visitorStats || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStats([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [placeId, startDate, endDate]);

  if (loading) {
    return <div className="h-80 bg-gray-200 rounded-lg animate-pulse" />;
  }

  if (error || stats.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-600">{error || 'No visitor data available'}</p>
      </div>
    );
  }

  const maxVisitors = Math.max(...stats.map(s => s.visitorCount), 1);
  const totalVisitors = stats.reduce((sum, s) => sum + s.visitorCount, 0);
  const avgVisitors = totalVisitors / stats.length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Ziyaretçi Trendi</h3>
        <div className="flex gap-4 text-sm">
          <div>
            <p className="text-gray-600">Toplam</p>
            <p className="text-2xl font-bold text-gray-900">{totalVisitors.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-600">Ortalama/Gün</p>
            <p className="text-2xl font-bold text-gray-900">{Math.round(avgVisitors)}</p>
          </div>
        </div>
      </div>

      {/* Mini Bar Chart */}
      <div className="space-y-3">
        {stats.slice(-7).reverse().map((stat, idx) => {
          const percentage = (stat.visitorCount / maxVisitors) * 100;
          const date = new Date(stat.date).toLocaleDateString('tr-TR', {
            month: 'short',
            day: 'numeric'
          });

          return (
            <div key={idx} className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-600 w-16">{date}</span>
              <div className="flex-1">
                <div className="bg-gray-200 rounded h-6">
                  <div
                    className="bg-blue-500 h-6 rounded transition-all flex items-center justify-end pr-2"
                    style={{ width: `${percentage}%` }}
                  >
                    {percentage > 20 && (
                      <span className="text-xs font-bold text-white">
                        {stat.visitorCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {percentage <= 20 && (
                <span className="text-xs font-medium text-gray-600 w-12">
                  {stat.visitorCount}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {stats.length > 7 && (
        <p className="text-xs text-gray-500 mt-4">
          Son 7 günü gösteriliyor ({stats.length} günlük veri mevcut)
        </p>
      )}
    </div>
  );
}
