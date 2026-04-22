/**
 * Subscription Manager Component
 * Manage active subscription and billing
 */

import React, { useState, useEffect } from "react";

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

function unwrapApiPayload(responseBody: any) {
  return responseBody?.data?.data || responseBody?.data || responseBody;
}

function getApiErrorMessage(responseBody: any, fallback: string) {
  return (
    responseBody?.error?.message ||
    responseBody?.error ||
    responseBody?.message ||
    fallback
  );
}

export function SubscriptionManager({ onUpgrade }: SubscriptionManagerProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/user/subscription");

        if (!response.ok) {
          throw new Error("Abonelik bilgisi yüklenemedi");
        }

        const data = unwrapApiPayload(await response.json());
        setSubscription(data.subscription || null);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Abonelik bilgisi yüklenemedi",
        );
        setSubscription(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  const handleCancel = async () => {
    if (
      !confirm(
        "Aboneliğinizi iptal etmek istediğinizden emin misiniz? Bu işlem geri alınamaz.",
      )
    ) {
      return;
    }

    setCancelling(true);

    try {
      const response = await fetch("/api/subscriptions/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = (await response.json()) as any;
        throw new Error(
          getApiErrorMessage(errorData, "Abonelik iptal edilemedi"),
        );
      }

      const data = unwrapApiPayload((await response.json()) as any);

      if (data.success) {
        alert(
          data.message ||
            "Aboneliğiniz başarıyla iptal edildi. Plan aylık sonunda sona erecektir.",
        );
        // Reload to update subscription status
        window.location.reload();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "İptal işlemi başarısız");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return <div className="h-40 bg-gray-200 rounded-lg animate-pulse" />;
  }

  if (error) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Abonelik bilgisi şu anda alınamadı
        </h3>
        <p className="text-amber-800 mb-4">
          {error}. Temel Şanlıurfa üyelik özellikleri ilk aşamada ücretsiz açık
          kalır.
        </p>
        <button
          onClick={onUpgrade}
          className="px-6 py-2 bg-urfa-700 hover:bg-urfa-800 text-white rounded-lg font-medium transition-colors"
        >
          Planları gör
        </button>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="bg-urfa-50 border-2 border-urfa-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Ücretsiz üyelik aktif
        </h3>
        <p className="text-gray-600 mb-4">
          Mekân keşfi, yorum, favori, takip, mesajlaşma ve topluluk özellikleri
          ilk aşamada ücretsiz açık tutulur. Premium ve işletme planlarını hazır
          olduğunda buradan yönetebilirsiniz.
        </p>
        <button
          onClick={onUpgrade}
          className="px-6 py-2 bg-urfa-700 hover:bg-urfa-800 text-white rounded-lg font-medium transition-colors"
        >
          Planları gör
        </button>
      </div>
    );
  }

  const daysUntilBilling = subscription.nextBillingDate
    ? Math.ceil(
        (new Date(subscription.nextBillingDate).getTime() -
          new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;
  const monthlyPrice = Number(subscription.tier.monthlyPrice || 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Aktif Plan</h3>
          <p className="text-gray-600 mt-1">{subscription.tier.displayName}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">
            {new Intl.NumberFormat("tr-TR", {
              style: "currency",
              currency: "TRY",
            }).format(monthlyPrice)}
          </p>
          <p className="text-sm text-gray-600">aylık</p>
        </div>
      </div>

      <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Başlangıç Tarihi</span>
          <span className="text-sm font-medium text-gray-900">
            {new Date(subscription.startDate).toLocaleDateString("tr-TR")}
          </span>
        </div>

        {subscription.nextBillingDate && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Sonraki Ödeme</span>
            <span className="text-sm font-medium text-gray-900">
              {new Date(subscription.nextBillingDate).toLocaleDateString(
                "tr-TR",
              )}
              {daysUntilBilling && daysUntilBilling > 0 && (
                <span className="text-gray-500 ml-2">
                  ({daysUntilBilling} gün)
                </span>
              )}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Otomatik Yenileme</span>
          <span
            className={`text-sm font-medium ${
              subscription.autoRenew ? "text-green-600" : "text-gray-600"
            }`}
          >
            {subscription.autoRenew ? "Aktif" : "Pasif"}
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onUpgrade}
          className="flex-1 px-4 py-2 bg-urfa-700 hover:bg-urfa-800 text-white rounded-lg font-medium transition-colors"
        >
          Yükselt
        </button>

        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="flex-1 px-4 py-2 bg-red-100 hover:bg-red-200 disabled:bg-gray-200 text-red-700 rounded-lg font-medium transition-colors"
        >
          {cancelling ? "İptal ediliyor..." : "İptal et"}
        </button>
      </div>
    </div>
  );
}
