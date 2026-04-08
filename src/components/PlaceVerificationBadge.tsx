/**
 * Place Verification Badge Component
 * Displays verification status badge with icon and tooltip
 */

import React from 'react';

interface PlaceVerificationBadgeProps {
  status?: 'pending' | 'verified' | 'rejected' | null;
  verifiedAt?: string;
  className?: string;
}

export function PlaceVerificationBadge({
  status,
  verifiedAt,
  className = ''
}: PlaceVerificationBadgeProps) {
  if (!status || status === 'rejected') {
    return null;
  }

  const statusConfig = {
    pending: {
      icon: '⏳',
      label: 'Doğrulama Beklemede',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300'
    },
    verified: {
      icon: '✅',
      label: 'Doğrulanmış Mekan',
      color: 'bg-green-100 text-green-800 border-green-300'
    }
  };

  const config = statusConfig[status];

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-full text-xs font-medium ${config.color} ${className}`}
      title={`${config.label}${verifiedAt ? ` - ${new Date(verifiedAt).toLocaleDateString('tr-TR')}` : ''}`}
    >
      <span className="text-sm">{config.icon}</span>
      <span>{config.label}</span>
    </div>
  );
}
