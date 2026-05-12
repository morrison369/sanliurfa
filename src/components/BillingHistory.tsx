/**
 * Billing History Component
 * Display user's billing history and invoices
 */
import { useState, useEffect } from 'react';
interface BillingRecord {
 id: string;
 subscriptionId: string;
 amount: number;
 currency: string;
 billingCycle: string;
 invoiceNumber?: string;
 paymentMethod?: string;
 status: string;
 paidAt?: string;
 nextBillingDate?: string;
 createdAt: string;
}

interface BillingHistoryProps {}

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
 throw new Error('Ödeme geçmişi yüklenemedi.');
 }

 const data = await response.json();
 setBilling(data.billing || []);
 setError(null);
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Ödeme geçmişi yüklenemedi.');
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
 className="h-16 bg-[rgba(184,115,51,0.08)] rounded-sm animate-pulse"
 />
 ))}
 </div>
 );
 }

 if (error) {
 return (
 <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] rounded-sm p-4">
 <p className="text-red-700 ">{error}</p>
 </div>
 );
 }

 if (billing.length === 0) {
 return (
 <div className="bg-[rgba(184,115,51,0.04)] border border-[rgba(184,115,51,0.14)] rounded-sm p-8 text-center">
 <p className="text-[#7A6B58]">Henüz ödeme kaydı yok</p>
 </div>
 );
 }

 return (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="border-b border-[rgba(184,115,51,0.14)]">
 <th className="text-left py-3 px-4 font-semibold text-[#1F1410]">
 Tarih
 </th>
 <th className="text-left py-3 px-4 font-semibold text-[#1F1410]">
 Miktar
 </th>
 <th className="text-left py-3 px-4 font-semibold text-[#1F1410]">
 Dönem
 </th>
 <th className="text-left py-3 px-4 font-semibold text-[#1F1410]">
 Durum
 </th>
 {/* <th className="text-left py-3 px-4 font-semibold text-[#1F1410]">
 Fatura
 </th> */}
 </tr>
 </thead>
 <tbody>
 {billing.map((record) => (
 <tr
 key={record.id}
 className="border-b border-[rgba(184,115,51,0.1)] hover:bg-[rgba(184,115,51,0.04)] transition-colors"
 >
 <td className="py-3 px-4 text-sm text-[#1F1410]">
 {new Date(record.createdAt).toLocaleDateString('tr-TR')}
 </td>
 <td className="py-3 px-4 text-sm font-medium text-[#1F1410]">
 ₺{record.amount.toFixed(2)}
 </td>
 <td className="py-3 px-4 text-sm text-[#7A6B58] capitalize">
 {record.billingCycle === 'monthly' ? 'Aylık' : 'Yıllık'}
 </td>
 <td className="py-3 px-4">
 <span
 className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
 record.status === 'paid'
 ? 'bg-[rgba(34,197,94,0.12)] text-green-400 '
 : record.status === 'pending'
 ? 'bg-[rgba(234,179,8,0.12)] text-yellow-400 '
 : 'bg-[rgba(239,68,68,0.1)] text-red-300 '
 }`}
 >
 {record.status === 'paid'
 ? 'Ödendi'
 : record.status === 'pending'
 ? 'Beklemede'
 : 'Başarısız'}
 </span>
 </td>
 {/* <td className="py-3 px-4 text-sm">
 {record.invoiceNumber ? (
 <a
 href={`#`}
 className="text-[#7A6B58] hover:text-[#1F1410] font-medium"
 >
 Faturayı İndir
 </a>
 ) : (
 <span className="text-[#4A3828]">—</span>
 )}
 </td> */}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 );
}
