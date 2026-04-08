/**
 * Place Badges Display Component
 * Shows all badges earned by a place
 */

import React, { useState, useEffect } from 'react';

interface Badge {
  id: string;
  placeId: string;
  badgeType: string;
  badgeName: string;
  icon?: string;
  awardedAt: string;
  reason?: string;
}

interface PlaceBadgesDisplayProps {
  placeId: string;
  className?: string;
}

export function PlaceBadgesDisplay({ placeId, className = '' }: PlaceBadgesDisplayProps) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/places/${placeId}/badges`);

        if (!response.ok) {
          throw new Error('Failed to fetch badges');
        }

        const data = await response.json();
        setBadges(data.badges || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setBadges([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBadges();
  }, [placeId]);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-8 bg-gray-200 rounded animate-pulse" style={{ width: '120px' }} />
      </div>
    );
  }

  if (error || badges.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center flex-wrap gap-2 ${className}`}>
      {badges.map((badge) => (
        <div
          key={badge.id}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-full text-xs font-medium text-purple-800 hover:shadow-md transition-shadow"
          title={`${badge.badgeName}${badge.reason ? ` - ${badge.reason}` : ''}`}
        >
          {badge.icon && <span className="text-base">{badge.icon}</span>}
          <span>{badge.badgeName}</span>
        </div>
      ))}
    </div>
  );
}
