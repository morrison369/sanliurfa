import { useState, type SubmitEvent } from 'react';

interface Props {
  placeId: string;
  placeName: string;
  isAuthenticated: boolean;
  redirectAfterLogin: string;
}

export default function ReviewForm({ placeId, placeName, isAuthenticated, redirectAfterLogin }: Props) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isAuthenticated) {
    return (
      <a
        href={`/giris?redirect=${encodeURIComponent(redirectAfterLogin)}`}
        className="pd-cta-btn"
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', width: '100%', padding: '0.85rem 1rem', background: '#fff', color: '#C0571F', fontSize: '0.9rem', fontWeight: 700, textDecoration: 'none', borderRadius: '6px' }}
      >
        Yorum Yazmak için Giriş Yap
      </a>
    );
  }

  const submit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (rating < 1 || rating > 5) {
      setError('Lütfen 1-5 arası puan seçin.');
      return;
    }
    if (content.trim().length < 10) {
      setError('Yorumunuz en az 10 karakter olmalı.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId, rating, title: title.trim() || null, content: content.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || data?.error || data?.title || 'Yorum gönderilemedi.');
      }
      // Başarılı: form alanlarını temizle, success state'e geç. Reload YOK — duplicate
      // submit önlemek için form unmount olur, kullanıcı tekrar görmek için sayfayı
      // kendisi yenileyebilir (moderasyon sonrası yorum görünür hale gelecek).
      setRating(0);
      setHoverRating(0);
      setTitle('');
      setContent('');
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yorum gönderilemedi.');
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{ background: 'rgba(44,122,82,.10)', border: '1px solid rgba(44,122,82,.3)', borderRadius: '8px', padding: '1rem', textAlign: 'center', color: '#1F5F40', fontSize: '.9rem', fontWeight: 600 }}
      >
        ✓ Yorumunuz alındı! Moderasyon sonrası yayınlanacak.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
          width: '100%', padding: '0.85rem 1rem',
          background: '#fff', color: '#C0571F', fontSize: '0.9rem', fontWeight: 700,
          border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'transform .15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
      >
        ✍ Yorum Yaz
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      style={{ background: '#fff', border: '1px solid rgba(192,87,31,.18)', padding: '1rem', borderRadius: '8px', textAlign: 'left', color: '#1F1410' }}
    >
      <p style={{ fontSize: '.78rem', fontWeight: 700, color: '#C0571F', marginBottom: '.65rem', letterSpacing: '.1em', textTransform: 'uppercase' }}>
        {placeName} için yorum
      </p>

      {/* Rating stars */}
      <div style={{ display: 'flex', gap: '.25rem', marginBottom: '.85rem' }} role="radiogroup" aria-label="Puanınız">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= (hoverRating || rating);
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              onMouseEnter={() => setHoverRating(n)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(n)}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: '.2rem', fontSize: '1.6rem', lineHeight: 1,
                color: filled ? '#D49718' : '#E2D2B8',
                transition: 'transform .1s',
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              aria-label={`${n} yıldız`}
            >
              ★
            </button>
          );
        })}
        {rating > 0 && (
          <span style={{ marginLeft: '.5rem', alignSelf: 'center', fontSize: '.85rem', color: '#5A4030', fontWeight: 600 }}>
            {rating}/5
          </span>
        )}
      </div>

      {/* Title (optional) */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Kısa başlık (opsiyonel)"
        maxLength={200}
        style={{
          width: '100%', padding: '.55rem .75rem', fontSize: '.88rem',
          border: '1px solid rgba(192,87,31,.18)', borderRadius: '5px',
          marginBottom: '.65rem', background: '#FBF6EC', color: '#1F1410',
          fontFamily: 'inherit',
        }}
      />

      {/* Content */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Deneyiminizi anlatın (en az 10 karakter)..."
        rows={4}
        minLength={10}
        maxLength={5000}
        required
        style={{
          width: '100%', padding: '.65rem .75rem', fontSize: '.88rem',
          border: '1px solid rgba(192,87,31,.18)', borderRadius: '5px',
          marginBottom: '.5rem', background: '#FBF6EC', color: '#1F1410',
          resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5,
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.7rem', color: '#7A6448', marginBottom: '.85rem' }}>
        <span>{content.length}/5000 karakter</span>
        {content.length > 0 && content.length < 10 && <span style={{ color: '#C0571F' }}>{10 - content.length} karakter daha</span>}
      </div>

      {error && (
        <div style={{ background: 'rgba(220,38,38,.08)', border: '1px solid rgba(220,38,38,.25)', color: '#B91C1C', padding: '.55rem .75rem', borderRadius: '5px', marginBottom: '.75rem', fontSize: '.82rem' }} role="alert">
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '.5rem' }}>
        <button
          type="submit"
          disabled={submitting}
          style={{
            flex: 1, padding: '.7rem 1rem', fontSize: '.88rem', fontWeight: 700,
            color: '#fff',
            background: submitting ? '#9A4517' : 'linear-gradient(135deg,#C0571F,#D49718)',
            border: 'none', borderRadius: '6px',
            cursor: submitting ? 'wait' : 'pointer',
            transition: 'transform .15s',
          }}
          onMouseEnter={(e) => !submitting && (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          {submitting ? 'Gönderiliyor...' : 'Gönder'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          disabled={submitting}
          style={{
            padding: '.7rem 1rem', fontSize: '.88rem', fontWeight: 600,
            color: '#5A4030', background: 'transparent',
            border: '1px solid rgba(192,87,31,.18)', borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          İptal
        </button>
      </div>
    </form>
  );
}
