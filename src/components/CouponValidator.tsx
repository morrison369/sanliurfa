/**
 * Coupon Validator Component
 * Validate and apply coupon codes
 */

import React, { useState } from 'react';

interface CouponValidatorProps {
  purchaseAmount: number;
  onApplyCoupon?: (discountAmount: number, couponCode: string) => void;
  onError?: (message: string) => void;
}

interface ValidationResult {
  valid: boolean;
  discount?: number;
  message: string;
}

export function CouponValidator({
  purchaseAmount,
  onApplyCoupon,
  onError
}: CouponValidatorProps) {
  const [couponCode, setCouponCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  const handleValidate = async () => {
    if (!couponCode.trim()) {
      setResult({
        valid: false,
        message: 'Lütfen kupon kodunu giriniz'
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/promotions/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          couponCode: couponCode.toUpperCase(),
          purchaseAmount
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({
          valid: false,
          message: data.error || 'Kupon doğrulanamadı'
        });
        onError?.(data.error || 'Kupon doğrulanamadı');
        return;
      }

      setResult({
        valid: true,
        discount: data.discount,
        message: data.message
      });

      setAppliedCoupon(couponCode.toUpperCase());
      onApplyCoupon?.(data.discount, couponCode.toUpperCase());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bir hata oluştu';
      setResult({
        valid: false,
        message
      });
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = () => {
    setCouponCode('');
    setResult(null);
    setAppliedCoupon(null);
    onApplyCoupon?.(0, '');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Kupon Kodu
      </label>

      {appliedCoupon ? (
        <div className="space-y-3">
          <div className="bg-green-50 border-2 border-dashed border-green-300 rounded px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Kupon Uygulandı</p>
                <code className="text-lg font-bold text-green-900 font-mono">{appliedCoupon}</code>
              </div>
              {result?.discount && (
                <div className="text-right">
                  <p className="text-sm text-green-600">İndirim</p>
                  <p className="text-2xl font-bold text-green-700">
                    ₺{result.discount.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleRemove}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium transition-colors"
          >
            Kupon Kodunu Kaldır
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            onKeyPress={(e) => e.key === 'Enter' && handleValidate()}
            placeholder="PROMOKOD giriniz"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            disabled={isLoading}
          />

          <button
            onClick={handleValidate}
            disabled={isLoading || !couponCode.trim()}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
          >
            {isLoading ? 'Kontrol Ediliyor...' : 'Kupon Kodunu Kontrol Et'}
          </button>

          {result && (
            <div className={`rounded-lg p-3 text-sm ${
              result.valid
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              <p className="font-medium">{result.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
