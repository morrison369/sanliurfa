/**
 * Subscription Manager Component
 * Manage active subscription and billing
 */
import { useState, useEffect } from 'react';
interface Subscription {
 id: string;
 tier: {
 displayName: string;
 monthlyPrice: number;
 };
 status: string;
 startDate: string;
 nextBillingDate?: string;
 autoRenew: boolean;
}

interface SubscriptionManagerProps {
 onUpgrade?: () => void;
}

export function SubscriptionManager({ onUpgrade }: SubscriptionManagerProps) {
 const [subscription, setSubscription] = useState<Subscription | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 const fetchSubscription = async () => {
 try {
 setLoading(true);
 const response = await fetch('/api/user/subscription');

 if (!response.ok) {
 throw new Error('Abonelik bilgisi yüklenemedi.');
 }

 const data = await response.json();
 setSubscription(data.subscription);
 setError(null);
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Bilinmeyen hata oluştu.');
 setSubscription(null);
 } finally {
 setLoading(false);
 }
 };

 fetchSubscription();
 }, []);

 if (loading) {
 return <div className="h-40 bg-[rgba(184,115,51,0.08)] rounded-sm animate-pulse" />;
 }

 if (error) {
 return (
 <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] rounded-sm p-4">
 <p className="text-red-700">{error}</p>
 </div>
 );
 }

 if (!subscription) {
 return (
 <div className="bg-[rgba(34,197,94,0.08)] border-2 border-green-300 rounded-sm p-6">
 <h3 className="text-lg font-semibold text-[#1F1410] mb-2">Faz 1 Açık Erişim</h3>
 <p className="text-[#7A6B58] mb-4">
 Tüm üyelik özellikleri şu anda ücretsiz olarak aktif. Ek ödeme gerekmez.
 </p>
 <button
 onClick={onUpgrade}
 className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-sm font-medium transition-colors"
 >
 Detayları Gör
 </button>
 </div>
 );
 }

 const daysUntilBilling = subscription.nextBillingDate
 ? Math.ceil(
 (new Date(subscription.nextBillingDate).getTime() - new Date().getTime()) /
 (1000 * 60 * 60 * 24)
 )
 : null;

 return (
 <div className="bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-6">
 <div className="flex items-center justify-between mb-6">
 <div>
 <h3 className="text-lg font-semibold text-[#1F1410]">Aktif Plan</h3>
 <p className="text-[#7A6B58] mt-1">{subscription.tier.displayName}</p>
 </div>
 <div className="text-right">
 <p className="text-2xl font-bold text-[#1F1410]">
 ₺{subscription.tier.monthlyPrice.toFixed(0)}
 </p>
 <p className="text-sm text-[#7A6B58]">aylık</p>
 </div>
 </div>

 <div className="space-y-3 mb-6 pb-6 border-b border-[rgba(184,115,51,0.14)]">
 <div className="flex items-center justify-between">
 <span className="text-sm text-[#7A6B58]">Başlangıç Tarihi</span>
 <span className="text-sm font-medium text-[#1F1410]">
 {new Date(subscription.startDate).toLocaleDateString('tr-TR')}
 </span>
 </div>

 {subscription.nextBillingDate && (
 <div className="flex items-center justify-between">
 <span className="text-sm text-[#7A6B58]">Sonraki Ödeme</span>
 <span className="text-sm font-medium text-[#1F1410]">
 {new Date(subscription.nextBillingDate).toLocaleDateString('tr-TR')}
 {daysUntilBilling && daysUntilBilling > 0 && (
 <span className="text-[#7A6B58] ml-2">({daysUntilBilling} gün)</span>
 )}
 </span>
 </div>
 )}

 <div className="flex items-center justify-between">
 <span className="text-sm text-[#7A6B58]">Otomatik Yenileme</span>
 <span
 className={`text-sm font-medium ${
 subscription.autoRenew ? 'text-green-600' : 'text-[#7A6B58]'
 }`}
 >
 {subscription.autoRenew ? 'Aktif' : 'Pasif'}
 </span>
 </div>
 </div>

 <div className="flex gap-3">
 <button
 onClick={onUpgrade}
 className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-sm font-medium transition-colors"
 >
 Faz 1 Bilgisi
 </button>

 <button
 onClick={() => undefined}
 disabled={true}
 className="flex-1 px-4 py-2 bg-[rgba(184,115,51,0.06)] text-[#7A6B58] rounded-sm font-medium cursor-not-allowed"
 >
 Faz 1'de faturalama pasif
 </button>
 </div>
 </div>
 );
}
