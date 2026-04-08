/**
 * Events List Component
 * Display events in a grid with filtering and pagination
 */

import React, { useState, useEffect } from 'react';
import { EventCard } from './EventCard';

interface Event {
  id: string;
  title: string;
  slug: string;
  description: string;
  start_date: string;
  end_date?: string;
  location?: string;
  category?: string;
  image_url?: string;
  is_free?: boolean;
  price?: number;
  attendee_count?: number;
  capacity?: number;
}

interface EventsListProps {
  category?: string;
  limit?: number;
}

export function EventsList({ category, limit = 20 }: EventsListProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          limit: String(limit),
          offset: String(offset)
        });

        if (category) {
          params.append('category', category);
        }

        const response = await fetch(`/api/events/list?${params}`);

        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }

        const data = await response.json();
        setEvents(data.events || []);
        setTotal(data.total || 0);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [category, limit, offset]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-80 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Etkinlikler yüklenemedi: {error}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Hiç etkinlik bulunamadı</p>
      </div>
    );
  }

  const hasMore = offset + limit < total;
  const hasPrevious = offset > 0;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {events.map(event => (
          <EventCard
            key={event.id}
            id={event.id}
            title={event.title}
            slug={event.slug}
            description={event.description}
            startDate={event.start_date}
            endDate={event.end_date}
            location={event.location}
            category={event.category}
            imageUrl={event.image_url}
            isFree={event.is_free}
            price={event.price}
            attendeeCount={event.attendee_count}
            capacity={event.capacity}
          />
        ))}
      </div>

      <div className="flex items-center justify-between py-4">
        <button
          onClick={() => setOffset(Math.max(0, offset - limit))}
          disabled={!hasPrevious}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-gray-800 rounded-lg font-medium transition-colors"
        >
          ← Önceki
        </button>

        <span className="text-sm text-gray-600">
          {offset + 1} - {Math.min(offset + limit, total)} / {total} etkinlik
        </span>

        <button
          onClick={() => setOffset(offset + limit)}
          disabled={!hasMore}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
        >
          Sonraki →
        </button>
      </div>
    </div>
  );
}
