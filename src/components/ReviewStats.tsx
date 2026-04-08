/**
 * Review Statistics Component
 * Display review analysis and sentiment
 */

import React, { useState, useEffect } from 'react';

interface ReviewAnalysis {
  totalReviews: number;
  averageRating: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  topKeywords: { keyword: string; frequency: number }[];
  recentReviews: any[];
}

interface ReviewStatsProps {
  placeId: string;
}

export function ReviewStats({ placeId }: ReviewStatsProps) {
  const [analysis, setAnalysis] = useState<ReviewAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/owner/analytics/reviews/${placeId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch review analysis');
        }

        const data = await response.json();
        setAnalysis(data.reviewAnalysis);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setAnalysis(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [placeId]);

  if (loading) {
    return <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />;
  }

  if (error || !analysis) {
    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <p className="text-gray-600">{error || 'Review data not available'}</p>
      </div>
    );
  }

  const sentimentPercentages = {
    positive: (analysis.positiveCount / analysis.totalReviews) * 100 || 0,
    neutral: (analysis.neutralCount / analysis.totalReviews) * 100 || 0,
    negative: (analysis.negativeCount / analysis.totalReviews) * 100 || 0
  };

  return (
    <div className="space-y-6">
      {/* Sentiment Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Yorum Duyarlılığı</h3>

        <div className="mb-6">
          <div className="flex gap-1 h-2 rounded-full overflow-hidden">
            <div
              className="bg-green-500"
              style={{ width: `${sentimentPercentages.positive}%` }}
            />
            <div
              className="bg-gray-400"
              style={{ width: `${sentimentPercentages.neutral}%` }}
            />
            <div
              className="bg-red-500"
              style={{ width: `${sentimentPercentages.negative}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{analysis.positiveCount}</p>
            <p className="text-xs text-gray-600">Olumlu</p>
            <p className="text-xs text-gray-500">
              ({sentimentPercentages.positive.toFixed(0)}%)
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-600">{analysis.neutralCount}</p>
            <p className="text-xs text-gray-600">Tarafsız</p>
            <p className="text-xs text-gray-500">
              ({sentimentPercentages.neutral.toFixed(0)}%)
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{analysis.negativeCount}</p>
            <p className="text-xs text-gray-600">Olumsuz</p>
            <p className="text-xs text-gray-500">
              ({sentimentPercentages.negative.toFixed(0)}%)
            </p>
          </div>
        </div>
      </div>

      {/* Average Rating */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Ortalama Puan</p>
            <p className="text-4xl font-bold text-gray-900 mt-2">
              {analysis.averageRating.toFixed(1)}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {analysis.totalReviews} yorum üzerinden
            </p>
          </div>
          <div className="text-5xl">⭐</div>
        </div>
      </div>

      {/* Recent Reviews */}
      {analysis.recentReviews.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">En Son Yorumlar</h4>
          <div className="space-y-3">
            {analysis.recentReviews.map((review: any, idx: number) => (
              <div key={idx} className="pb-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-medium text-gray-900">
                    {'⭐'.repeat(review.rating)}
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(review.created_at).toLocaleDateString('tr-TR')}
                  </p>
                </div>
                {review.comment && (
                  <p className="text-sm text-gray-600 line-clamp-2">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
