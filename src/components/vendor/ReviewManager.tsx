import { useEffect, useState } from 'react';
import { ArrowRight, MessageCircle, Star } from 'lucide-react';

interface ReviewSummary {
 total_reviews: number;
 avg_rating: number;
 responses_count: number;
 positive_count: number;
 negative_count: number;
 total_helpful_votes: number;
}

interface Review {
 id: string;
 user_name: string;
 rating: number;
 title?: string | null;
 content: string;
 created_at: string;
 owner_response?: string | null;
 owner_responded_at?: string | null;
}

const EMPTY_SUMMARY: ReviewSummary = {
 total_reviews: 0,
 avg_rating: 0,
 responses_count: 0,
 positive_count: 0,
 negative_count: 0,
 total_helpful_votes: 0,
};

export default function ReviewManager({ placeId }: { placeId: string }) {
 const [summary, setSummary] = useState<ReviewSummary>(EMPTY_SUMMARY);
 const [reviews, setReviews] = useState<Review[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
  let ignore = false;

  const load = async () => {
   setLoading(true);
   setError(null);
   try {
    const [summaryRes, reviewsRes] = await Promise.all([
     fetch(`/api/places/${placeId}/review-analytics`),
     fetch(`/api/reviews?placeId=${placeId}&limit=5&sortBy=newest`),
    ]);

    if (!summaryRes.ok || !reviewsRes.ok) {
     throw new Error('Yorum verileri alınamadı');
    }

    const summaryJson = await summaryRes.json();
    const reviewsJson = await reviewsRes.json();
    const summaryData = summaryJson.data?.data?.summary ?? summaryJson.data?.summary ?? {};
    const reviewRows = reviewsJson.data?.reviews ?? reviewsJson.reviews ?? [];

    if (ignore) return;

    setSummary({
     total_reviews: Number(summaryData.total_reviews ?? 0),
     avg_rating: Number(summaryData.avg_rating ?? 0),
     responses_count: Number(summaryData.responses_count ?? 0),
     positive_count: Number(summaryData.positive_count ?? 0),
     negative_count: Number(summaryData.negative_count ?? 0),
     total_helpful_votes: Number(summaryData.total_helpful_votes ?? 0),
    });
    setReviews(
     reviewRows.map((review: any) => ({
      id: review.id,
      user_name: review.user_name ?? 'Üye',
      rating: Number(review.rating ?? 0),
      title: review.title ?? null,
      content: review.content ?? '',
      created_at: review.created_at,
      owner_response: review.owner_response ?? null,
      owner_responded_at: review.owner_responded_at ?? null,
     }))
    );
   } catch (loadError) {
    if (ignore) return;
    setError(loadError instanceof Error ? loadError.message : 'Yorum verileri alınamadı.');
   } finally {
    if (!ignore) {
     setLoading(false);
    }
   }
  };

  void load();
  return () => {
   ignore = true;
  };
 }, [placeId]);

 const answeredCount = summary.responses_count;
 const pendingCount = Math.max(summary.total_reviews - answeredCount, 0);

 return (
 <section className="bg-[var(--bg-card)] rounded-sm p-6 border border-[rgba(184,115,51,0.14)]">
 <div className="flex items-start justify-between gap-4 mb-6">
 <div>
 <h2 className="text-xl font-semibold text-[#1F1410]">Yorum Özeti</h2>
 <p className="text-sm text-[#7A6B58] mt-1">Gerçek müşteri yorumlarını izleyin ve yanıt akışını yönetin.</p>
 </div>
 <a href="/vendor/yorumlar" className="inline-flex items-center gap-2 text-sm font-medium text-[#B87333] hover:text-[#8A5728]">
 Tüm yorumları yönet
 <ArrowRight className="w-4 h-4" />
 </a>
 </div>

 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
 <div className="bg-[rgba(184,115,51,0.06)] rounded-sm p-4">
 <div className="text-2xl font-bold text-[#1F1410]">{summary.total_reviews}</div>
 <div className="text-sm text-[#7A6B58]">Toplam Yorum</div>
 </div>
 <div className="bg-[rgba(184,115,51,0.06)] rounded-sm p-4">
 <div className="text-2xl font-bold text-amber-600">{summary.avg_rating.toFixed(1)}</div>
 <div className="text-sm text-[#7A6B58]">Ortalama Puan</div>
 </div>
 <div className="bg-[rgba(184,115,51,0.06)] rounded-sm p-4">
 <div className="text-2xl font-bold text-green-600">{answeredCount}</div>
 <div className="text-sm text-[#7A6B58]">Yanıtlanan</div>
 </div>
 <div className="bg-[rgba(184,115,51,0.06)] rounded-sm p-4">
 <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
 <div className="text-sm text-[#7A6B58]">Yanıt Bekleyen</div>
 </div>
 </div>

 {loading && <div className="text-sm text-[#7A6B58]">Yorum özeti yükleniyor…</div>}
 {error && <div className="text-sm text-red-700 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.18)] rounded-sm p-3">{error}</div>}

 {!loading && !error && (
 <div className="space-y-4">
 {reviews.length > 0 ? (
  reviews.map(review => (
   <article key={review.id} className="border border-[rgba(184,115,51,0.14)] rounded-sm p-4">
   <div className="flex items-start justify-between gap-3 mb-3">
   <div>
   <div className="font-medium text-[#1F1410]">{review.user_name}</div>
   <div className="text-sm text-[#7A6B58]">
   {new Date(review.created_at).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
   })}
   </div>
   </div>
   <div className="flex items-center gap-1 text-amber-600">
   <Star className="w-4 h-4 fill-current" />
   <span>{review.rating}</span>
   </div>
   </div>

   {review.title && <h3 className="font-medium text-[#1F1410] mb-2">{review.title}</h3>}
   <p className="text-sm text-[#4A3828] leading-6">{review.content}</p>

   {review.owner_response ? (
   <div className="mt-4 bg-[rgba(184,115,51,0.05)] border-l-2 border-[#B87333] rounded-sm p-4">
    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7A6B58] mb-2">Yanıtlandı</div>
    <p className="text-sm text-[#4A3828] leading-6">{review.owner_response}</p>
   </div>
   ) : (
   <div className="mt-4 inline-flex items-center gap-2 text-sm text-[#B87333]">
    <MessageCircle className="w-4 h-4" />
    Yanıt bekliyor
   </div>
   )}
   </article>
  ))
 ) : (
  <div className="text-center py-10 border border-dashed border-[rgba(184,115,51,0.24)] rounded-sm">
  <MessageCircle className="w-12 h-12 text-[#B87333] mx-auto mb-3" />
  <p className="text-[#7A6B58]">Henüz yorum bulunmuyor.</p>
  </div>
 )}
 </div>
 )}
 </section>
 );
}
