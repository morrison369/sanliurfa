import { useState, useEffect } from 'react';
import { Star, MessageCircle, CheckCircle, XCircle, Reply } from 'lucide-react';

interface Review {
  id: string;
  user_name: string;
  user_avatar?: string;
  rating: number;
  content: string;
  created_at: string;
  reply?: string;
  reply_date?: string;
  status: 'pending' | 'approved' | 'rejected';
  is_featured: boolean;
}

export default function ReviewManager({ placeId }: { placeId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'featured'>('all');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    // Mock veriler
    const mockReviews: Review[] = [
      {
        id: '1',
        user_name: 'Ahmet Y.',
        rating: 5,
        content: 'Ciğerin tadına doyamadım! 25 yıldır gelirim, hiç bozmadılar. 2026 fiyatları biraz artmış ama hak ediyor.',
        created_at: '2026-04-10',
        status: 'approved',
        is_featured: true,
      },
      {
        id: '2',
        user_name: 'Mehmet K.',
        rating: 5,
        content: 'QR menü çok pratik olmuş. Personel çok ilgili.',
        created_at: '2026-04-08',
        reply: 'Teşekkür ederiz, bekleriz!',
        reply_date: '2026-04-09',
        status: 'approved',
        is_featured: false,
      },
      {
        id: '3',
        user_name: 'Ayşe S.',
        rating: 4,
        content: 'Lezzet güzel ama oturma yerleri biraz dar.',
        created_at: '2026-04-05',
        status: 'pending',
        is_featured: false,
      },
    ];
    setReviews(mockReviews);
  }, [placeId]);

  const handleReply = (reviewId: string) => {
    if (!replyText.trim()) return;
    
    setReviews(prev => prev.map(review => 
      review.id === reviewId 
        ? { ...review, reply: replyText, reply_date: new Date().toISOString().split('T')[0] }
        : review
    ));
    setReplyingTo(null);
    setReplyText('');
  };

  const handleStatusChange = (reviewId: string, status: 'approved' | 'rejected') => {
    setReviews(prev => prev.map(review => 
      review.id === reviewId ? { ...review, status } : review
    ));
  };

  const handleFeature = (reviewId: string) => {
    setReviews(prev => prev.map(review => 
      review.id === reviewId ? { ...review, is_featured: !review.is_featured } : review
    ));
  };

  const filteredReviews = reviews.filter(review => {
    if (filter === 'pending') return review.status === 'pending';
    if (filter === 'featured') return review.is_featured;
    return true;
  });

  const stats = {
    total: reviews.length,
    average: (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1),
    pending: reviews.filter(r => r.status === 'pending').length,
    featured: reviews.filter(r => r.is_featured).length,
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">Toplam Yorum</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{stats.average}</div>
          <div className="text-sm text-gray-500">Ortalama Puan</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          <div className="text-sm text-gray-500">Onay Bekleyen</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.featured}</div>
          <div className="text-sm text-gray-500">Öne Çıkan</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'Tümü', count: reviews.length },
            { key: 'pending', label: 'Onay Bekleyen', count: stats.pending },
            { key: 'featured', label: 'Öne Çıkan', count: stats.featured },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key as 'all' | 'pending' | 'featured')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === key
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.map(review => (
          <div key={review.id} className={`bg-white rounded-xl shadow-sm p-6 ${review.is_featured ? 'ring-2 ring-amber-500' : ''}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                  {review.user_name.charAt(0)}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{review.user_name}</div>
                  <div className="text-sm text-gray-500">{review.created_at}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex text-yellow-400">
                  {'★'.repeat(review.rating)}
                  <span className="text-gray-300">{'★'.repeat(5 - review.rating)}</span>
                </div>
                {review.is_featured && (
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                    Öne Çıkan
                  </span>
                )}
              </div>
            </div>

            <p className="text-gray-700 mb-4">{review.content}</p>

            {/* Reply */}
            {review.reply && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4 ml-8">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <MessageCircle className="w-4 h-4" />
                  Yanıtınız ({review.reply_date})
                </div>
                <p className="text-gray-700">{review.reply}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-4 border-t">
              {review.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleStatusChange(review.id, 'approved')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Onayla
                  </button>
                  <button
                    onClick={() => handleStatusChange(review.id, 'rejected')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Reddet
                  </button>
                </>
              )}
              
              {!review.reply && review.status === 'approved' && (
                <button
                  onClick={() => setReplyingTo(replyingTo === review.id ? null : review.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
                >
                  <Reply className="w-4 h-4" />
                  Yanıtla
                </button>
              )}

              <button
                onClick={() => handleFeature(review.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ml-auto ${
                  review.is_featured
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Star className={`w-4 h-4 ${review.is_featured ? 'fill-current' : ''}`} />
                {review.is_featured ? 'Öne Çıkarıldı' : 'Öne Çıkar'}
              </button>
            </div>

            {/* Reply Form */}
            {replyingTo === review.id && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Yorum yazın..."
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg mb-3"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900"
                  >
                    İptal
                  </button>
                  <button
                    onClick={() => handleReply(review.id)}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                  >
                    Gönder
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredReviews.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl">
            <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Bu filtreye uygun yorum bulunamadı.</p>
          </div>
        )}
      </div>
    </div>
  );
}
