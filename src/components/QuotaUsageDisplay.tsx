/**
 * Quota Usage Display Component
 * Show user's feature quotas and usage
 */
import { useState, useEffect } from 'react';
interface QuotaItem {
 feature: string;
 current: number;
 limit: number | null;
 remaining: number | null;
 percentageUsed: number;
 resetDate: string | null;
 message: string;
}

interface QuotaResponse {
 success: boolean;
 tier: { name: string; level: number } | null;
 quotas: QuotaItem[];
 summary: {
 totalQuotas: number;
 limitedQuotas: number;
 unlimitedQuotas: number;
 };
}

interface QuotaUsageDisplayProps {
 compact?: boolean;
}

export default function QuotaUsageDisplay({ compact = false }: QuotaUsageDisplayProps) {
 const [data, setData] = useState<QuotaResponse | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 const fetchQuotas = async () => {
 try {
 setLoading(true);
 const response = await fetch('/api/user/quotas');

 if (!response.ok) {
 throw new Error('Kota bilgileri yüklenemedi.');
 }

 const quotaData = await response.json() as QuotaResponse;
 setData(quotaData);
 setError(null);
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Kota bilgileri yüklenemedi.');
 } finally {
 setLoading(false);
 }
 };

 fetchQuotas();
 }, []);

 if (loading) {
 return (
 <div className="space-y-3">
 {[1, 2, 3].map((i) => (
 <div
 key={i}
 className="h-12 bg-[rgba(184,115,51,0.08)] rounded-sm animate-pulse"
 />
 ))}
 </div>
 );
 }

 if (error) {
 return (
 <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] rounded-sm p-4">
 <p className="text-red-700 text-sm">{error}</p>
 </div>
 );
 }

 if (!data || data.quotas.length === 0) {
 return (
 <div className="bg-[rgba(184,115,51,0.04)] border border-[rgba(184,115,51,0.14)] rounded-sm p-4 text-center">
 <p className="text-[#7A6B58] text-sm">Kota bilgisi yüklenmedi</p>
 </div>
 );
 }

 const getProgressColor = (percentage: number) => {
 if (percentage >= 100) return 'bg-[rgba(239,68,68,0.1)]0';
 if (percentage >= 80) return 'bg-[rgba(234,179,8,0.08)]0';
 if (percentage >= 50) return 'bg-urfa-600';
 return 'bg-[rgba(34,197,94,0.08)]0';
 };

 const getWarningColor = (percentage: number) => {
 if (percentage >= 100) return 'border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.1)] ';
 if (percentage >= 80) return 'border-[rgba(234,179,8,0.25)] bg-[rgba(234,179,8,0.08)] ';
 return '';
 };

 const limitedQuotas = data.quotas.filter((q) => q.limit !== null);

 if (compact && limitedQuotas.length === 0) {
 return null;
 }

 return (
 <div className="space-y-4">
 {compact ? (
 // Kompakt görünümde yalnızca sınırlı özellikleri göster.
 <div className="space-y-3">
 {limitedQuotas.map((quota) => (
 <div
 key={quota.feature}
 className={`rounded-sm p-3 border ${getWarningColor(quota.percentageUsed)}`}
 >
 <div className="flex items-center justify-between mb-2">
 <span className="text-sm font-medium text-[#1F1410]">
 {quota.feature}
 </span>
 <span className="text-xs font-semibold text-[#7A6B58]">
 {quota.current}/{quota.limit}
 </span>
 </div>
 <div className="w-full bg-[rgba(184,115,51,0.08)] rounded-full h-2">
 <div
 className={`h-2 rounded-full transition-all ${getProgressColor(quota.percentageUsed)}`}
 style={{ width: `${Math.min(quota.percentageUsed, 100)}%` }}
 />
 </div>
 <p className="text-xs text-[#7A6B58] mt-1">{quota.message}</p>
 </div>
 ))}
 </div>
 ) : (
 // Tam görünümde tüm kotaları göster.
 <div>
 <h3 className="text-lg font-semibold text-[#1F1410] mb-4">
 Kullanım Kotaları
 </h3>
 <div className="space-y-4">
 {data.quotas.map((quota) => (
 <div
 key={quota.feature}
 className={`rounded-sm p-4 border ${getWarningColor(quota.percentageUsed)}`}
 >
 <div className="flex items-center justify-between mb-2">
 <div>
 <h4 className="font-medium text-[#1F1410]">
 {quota.feature}
 </h4>
 {quota.limit !== null && (
 <p className="text-sm text-[#7A6B58]">
 {quota.message}
 </p>
 )}
 {quota.limit === null && (
 <p className="text-sm text-green-600 ">
 Sınırsız ✓
 </p>
 )}
 </div>
 {quota.limit !== null && (
 <span className="text-sm font-semibold text-[#7A6B58]">
 {quota.current}/{quota.limit}
 </span>
 )}
 </div>

 {quota.limit !== null && (
 <>
 <div className="w-full bg-[rgba(184,115,51,0.08)] rounded-full h-2.5 mb-2">
 <div
 className={`h-2.5 rounded-full transition-all ${getProgressColor(
 quota.percentageUsed
 )}`}
 style={{ width: `${Math.min(quota.percentageUsed, 100)}%` }}
 />
 </div>
 <div className="flex items-center justify-between text-xs text-[#7A6B58]">
 <span>{quota.percentageUsed}% kullanılmış</span>
 {quota.resetDate && (
 <span>
 Sıfırlanma:{' '}
 {new Date(quota.resetDate).toLocaleDateString('tr-TR')}
 </span>
 )}
 </div>
 </>
 )}
 </div>
 ))}
 </div>

 {data.tier && (
 <div className="mt-6 p-4 bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)] rounded-sm">
 <p className="text-sm text-blue-300 ">
 <span className="font-semibold">Erişim modu:</span> Faz 1 açık erişim
 </p>
 <p className="text-sm text-blue-300 mt-2">
 Bu aşamada özellikler ücretsiz ve sınırsız olarak kullanılabilir.
 </p>
 </div>
 )}
 </div>
 )}
 </div>
 );
}
