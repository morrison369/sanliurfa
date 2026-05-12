import { useState, useEffect, type SubmitEvent } from 'react';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_name: string | null;
  user_username: string | null;
}

interface Props {
  postId: string;
  postTitle: string;
  isAuthenticated: boolean;
}

export default function BlogComments({ postId, postTitle, isAuthenticated }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/comments?targetType=blog&targetId=${encodeURIComponent(postId)}`)
      .then(r => r.json())
      .then(d => setComments(d?.data?.comments || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [postId]);

  const submit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (content.trim().length < 5) { setError('En az 5 karakter yazın.'); return; }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: 'blog', targetId: postId, content: content.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || data?.error || 'Gönderilemedi.');
      setSuccess(true);
      setContent('');
      if (data?.data?.comment) setComments(prev => [data.data.comment, ...prev]);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yorum gönderilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

  const S: Record<string, string | number> = { fontFamily: 'inherit', fontSize: '.88rem', lineHeight: '1.5' };

  return (
    <div style={{ marginTop: '2.5rem', borderTop: '1px solid rgba(184,115,51,.12)', paddingTop: '1.5rem' }}>
      <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.25rem', fontWeight: 700, color: '#1F1410', marginBottom: '1.25rem' }}>
        Yorumlar {comments.length > 0 && <span style={{ fontSize: '.85rem', fontWeight: 400, color: '#7A6448' }}>({comments.length})</span>}
      </h3>

      {isAuthenticated ? (
        <form onSubmit={submit} style={{ marginBottom: '1.5rem', background: '#FBF6EC', border: '1px solid rgba(192,87,31,.15)', padding: '1rem', borderRadius: '6px' }}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={`"${postTitle}" hakkında düşüncelerinizi paylaşın...`}
            rows={3}
            maxLength={2000}
            style={{ width: '100%', padding: '.6rem .75rem', ...S, border: '1px solid rgba(192,87,31,.18)', borderRadius: '5px', background: '#fff', color: '#1F1410', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '.65rem', gap: '.75rem' }}>
            {error && <span style={{ fontSize: '.78rem', color: '#B91C1C', flex: 1 }}>{error}</span>}
            {success && <span style={{ fontSize: '.78rem', color: '#1F5F40', flex: 1 }}>✓ Yorumunuz gönderildi!</span>}
            {!error && !success && <span style={{ fontSize: '.72rem', color: '#7A6448' }}>{content.length}/2000</span>}
            <button
              type="submit"
              disabled={submitting || content.trim().length < 5}
              style={{ padding: '.5rem 1.1rem', background: '#C0571F', color: '#fff', border: 'none', borderRadius: '5px', fontSize: '.84rem', fontWeight: 700, cursor: submitting ? 'wait' : 'pointer', opacity: (submitting || content.trim().length < 5) ? 0.6 : 1 }}
            >
              {submitting ? 'Gönderiliyor…' : 'Gönder'}
            </button>
          </div>
        </form>
      ) : (
        <a
          href={`/giris?redirect=/blog/${postId}`}
          style={{ display: 'inline-block', marginBottom: '1.25rem', padding: '.6rem 1.2rem', background: 'rgba(192,87,31,.1)', color: '#C0571F', border: '1px solid rgba(192,87,31,.25)', borderRadius: '5px', fontSize: '.85rem', fontWeight: 600, textDecoration: 'none' }}
        >
          Yorum yazmak için giriş yapın →
        </a>
      )}

      {loading ? (
        <p style={{ fontSize: '.85rem', color: '#7A6448' }}>Yorumlar yükleniyor…</p>
      ) : comments.length === 0 ? (
        <p style={{ fontSize: '.85rem', color: '#7A6448', fontStyle: 'italic' }}>Henüz yorum yok. İlk yorumu siz yapın!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {comments.map((c) => (
            <div key={c.id} style={{ background: '#FBF6EC', border: '1px solid rgba(184,115,51,.12)', borderRadius: '6px', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '.85rem', color: '#1F1410' }}>
                  {c.user_name || c.user_username || 'Ziyaretçi'}
                </span>
                <span style={{ fontSize: '.72rem', color: '#7A6448' }}>{formatDate(c.created_at)}</span>
              </div>
              <p style={{ fontSize: '.88rem', color: '#4A3828', lineHeight: 1.6, margin: 0 }}>{c.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
