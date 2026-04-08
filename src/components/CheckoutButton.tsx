/**
 * Checkout Button Component
 * Initiate Stripe checkout for subscription upgrade
 */

import React, { useState } from 'react';

interface CheckoutButtonProps {
  tierId: string;
  tierName: string;
  billingCycle?: 'monthly' | 'annual';
  className?: string;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function CheckoutButton({
  tierId,
  tierName,
  billingCycle = 'monthly',
  className = '',
  disabled = false,
  onSuccess,
  onError,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    try {
      setLoading(true);
      setError(null);

      // Create checkout session
      const response = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tierId,
          billingCycle,
        }),
      });

      if (!response.ok) {
        const data = await response.json() as any;
        throw new Error(data.error || 'Failed to create checkout session');
      }

      const data = await response.json() as any;

      if (data.success && data.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = data.checkoutUrl;
        onSuccess?.();
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Checkout failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleCheckout}
        disabled={disabled || loading}
        className={`w-full px-4 py-3 rounded-lg font-medium transition-all ${
          disabled || loading
            ? 'bg-gray-200 text-gray-700 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg'
        } ${className}`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span>
            İşleniyor...
          </span>
        ) : (
          `${tierName} Planı Seç`
        )}
      </button>

      {error && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
    </div>
  );
}
