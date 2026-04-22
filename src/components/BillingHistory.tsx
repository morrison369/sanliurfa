/**
 * Billing History Component
 * Display user's billing history and invoices
 */

import React, { useState, useEffect } from 'react';

interface BillingRecord {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  billingCycle?: string;
  invoiceNumber?: string;
  paymentMethod?: string;
  status?: string;
  paymentStatus?: string;
  paidAt?: string;
  paymentDate?: string;
  nextBillingDate?: string;
  createdAt: string;
}

interface BillingHistoryProps {}

function unwrapApiPayload(responseBody: any) {
  return responseBody?.data?.data || responseBody?.data || responseBody;
}

export default function BillingHistory({}: BillingHistoryProps) {
  const [billing, setBilling] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBillingHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/user/subscription/billing');

        if (!response.ok) {
          throw new Error('Failed to fetch billing history');
        }

        const data = unwrapApiPayload(await response.json());
        setBilling(data.billing || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ödeme geçmişi yüklenemedi');
        setBilling([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBillingHistory();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }

  if (billing.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">Henüz ödeme kaydı yok</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
              Tarih
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
              Miktar
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
              Dönem
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
              Durum
            </th>
            {/* <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
              Fatura
            </th> */}
          </tr>
        </thead>
        <tbody>
          {billing.map((record) => {
            const status = record.paymentStatus || record.status || 'pending';
            const amount = Number(record.amount || 0);
            const date = record.paymentDate || record.paidAt || record.createdAt;

            return (
              <tr
                key={record.id}
                className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                  {new Date(date).toLocaleDateString('tr-TR')}
                </td>
                <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                  {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount)}
                </td>
                <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {record.billingCycle === 'annual' ? 'Yıllık' : 'Aylık'}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      ['paid', 'completed'].includes(status)
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                        : status === 'pending'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                    }`}
                  >
                    {['paid', 'completed'].includes(status)
                      ? 'Ödendi'
                      : status === 'pending'
                      ? 'Beklemede'
                      : 'Başarısız'}
                  </span>
                </td>
              {/* <td className="py-3 px-4 text-sm">
                {record.invoiceNumber ? (
                  <a
                    href={`#`}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                  >
                    Faturayı İndir
                  </a>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td> */}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
