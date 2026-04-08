/**
 * Event Card Component
 * Displays event information in a card format
 */

import React from 'react';

interface EventCardProps {
  id: string;
  title: string;
  slug: string;
  description: string;
  startDate: string;
  endDate?: string;
  location?: string;
  category?: string;
  imageUrl?: string;
  isFree?: boolean;
  price?: number;
  attendeeCount?: number;
  capacity?: number;
}

export function EventCard({
  id,
  title,
  slug,
  description,
  startDate,
  location,
  category,
  imageUrl,
  isFree,
  price,
  attendeeCount = 0,
  capacity
}: EventCardProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tr-TR', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const capacityPercentage = capacity ? Math.round((attendeeCount / capacity) * 100) : 0;

  return (
    <a
      href={`/etkinlikler/${slug}`}
      className="block bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
    >
      {imageUrl && (
        <div className="h-48 bg-gray-200 overflow-hidden">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover hover:scale-105 transition-transform"
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {category && (
            <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              {category}
            </span>
          )}
          {capacity && capacity > 0 && (
            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
              capacityPercentage < 80
                ? 'bg-green-100 text-green-800'
                : capacityPercentage < 100
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {attendeeCount}/{capacity} katılımcı
            </span>
          )}
        </div>

        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{title}</h3>

        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{description}</p>

        <div className="space-y-1 text-sm text-gray-600 mb-3">
          <div className="flex items-center gap-2">
            <span>📅</span>
            <span>{formatDate(startDate)}</span>
          </div>
          {location && (
            <div className="flex items-center gap-2">
              <span>📍</span>
              <span>{location}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div>
            {isFree ? (
              <span className="text-sm font-medium text-green-600">Ücretsiz</span>
            ) : price ? (
              <span className="text-sm font-medium text-gray-900">₺{price}</span>
            ) : null}
          </div>
          <span className="text-xs text-gray-500">Detayları gör →</span>
        </div>
      </div>
    </a>
  );
}
