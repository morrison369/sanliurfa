import { useEffect, useState } from 'react';
import { fetchAdminDashboardOverview } from '../lib/admin-browser-client';
import type { AdminDashboardOverviewData } from '../types/admin-api';

export function useAdminDashboardOverview(period: number) {
  const [data, setData] = useState<AdminDashboardOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const payload = await fetchAdminDashboardOverview(period);

        if (!payload.success) {
          if (!active) return;
          setError('Veri alınırken bir hata oluştu');
          return;
        }

        if (!active) return;
        setData(payload.data);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [period]);

  return { data, loading, error };
}
