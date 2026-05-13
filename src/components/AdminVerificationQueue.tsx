/**
 * Admin Verification Queue — enterprise redesign 2026.
 * Mekan/işletme doğrulama taleplerini onayla veya gerekçe ile reddet.
 */
import { useState, useEffect } from 'react';
import { Check, X, ShieldCheck, Calendar, Star, Tag, AlertCircle, Inbox } from 'lucide-react';

interface VerificationRequest {
 id: string;
 placeId: string;
 placeName: string;
 category: string;
 rating: number;
 requestedAt: string;
 reason?: string;
}

interface Props {
 onRefresh?: () => void;
}

export function AdminVerificationQueue({ onRefresh }: Props) {
 const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [actionError, setActionError] = useState<string | null>(null);
 const [processingId, setProcessingId] = useState<string | null>(null);
 const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
 const [showRejectForm, setShowRejectForm] = useState<string | null>(null);
 const [rejectValidationError, setRejectValidationError] = useState<string | null>(null);

 useEffect(() => {
  fetchVerifications();
 }, []);

 const fetchVerifications = async () => {
  try {
   setLoading(true);
   const response = await fetch('/api/admin/verifications?limit=50');
   if (!response.ok) throw new Error('Doğrulama kuyruğu yüklenemedi.');
   const raw = await response.json();
   const list = raw?.data?.data?.verifications || raw?.data?.verifications || raw?.verifications || [];
   setVerifications(Array.isArray(list) ? list : []);
   setError(null);
  } catch (err) {
   setError(err instanceof Error ? err.message : 'Bilinmeyen hata oluştu.');
   setVerifications([]);
  } finally {
   setLoading(false);
  }
 };

 const handleApprove = async (id: string) => {
  setProcessingId(id);
  try {
   const response = await fetch(`/api/admin/verifications/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: '' }),
   });
   if (!response.ok) throw new Error('Doğrulama talebi onaylanamadı.');
   setVerifications(prev => prev.filter(v => v.id !== id));
   onRefresh?.();
  } catch (err) {
   setActionError(err instanceof Error ? err.message : 'Onaylama işlemi başarısız oldu.');
  } finally {
   setProcessingId(null);
  }
 };

 const handleReject = async (id: string) => {
  const reason = rejectReason[id];
  if (!reason || reason.trim().length < 10) {
   setRejectValidationError('Reddetme nedeni en az 10 karakter olmalıdır.');
   return;
  }
  setRejectValidationError(null);
  setProcessingId(id);
  try {
   const response = await fetch(`/api/admin/verifications/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
   });
   if (!response.ok) throw new Error('Doğrulama talebi reddedilemedi.');
   setVerifications(prev => prev.filter(v => v.id !== id));
   setShowRejectForm(null);
   onRefresh?.();
  } catch (err) {
   setActionError(err instanceof Error ? err.message : 'Reddetme işlemi başarısız oldu.');
  } finally {
   setProcessingId(null);
  }
 };

 if (loading) {
  return (
   <div className="vq-page">
    <div className="vq-stats">
     {[1,2,3].map(i => <div key={i} className="vq-skel-stat" />)}
    </div>
    <div className="vq-list">
     {[1,2,3].map(i => <div key={i} className="vq-skel-card" />)}
    </div>
   </div>
  );
 }

 if (error) {
  return (
   <div className="vq-error">
    <AlertCircle className="w-5 h-5" />
    <p>{error}</p>
   </div>
  );
 }

 if (verifications.length === 0) {
  return (
   <div className="vq-empty">
    <ShieldCheck className="w-10 h-10 vq-empty-icon" />
    <h3 className="vq-empty-title">Bekleyen talep yok</h3>
    <p className="vq-empty-desc">Doğrulama kuyruğu temiz. Yeni talepler geldiğinde burada görünecek.</p>
   </div>
  );
 }

 // Quick stats
 const avgRating = verifications.length > 0
  ? (verifications.reduce((s, v) => s + (v.rating || 0), 0) / verifications.length).toFixed(1)
  : '0';
 const oldestDays = verifications.length > 0
  ? Math.max(...verifications.map(v => Math.floor((Date.now() - new Date(v.requestedAt).getTime()) / (1000 * 60 * 60 * 24))))
  : 0;
 const categories = new Set(verifications.map(v => v.category)).size;

 return (
  <div className="vq-page">
   <div className="vq-stats">
    <div className="vq-stat vq-stat--amber">
     <div className="vq-stat-icon"><Inbox className="w-5 h-5" /></div>
     <div>
      <p className="vq-stat-val">{verifications.length}</p>
      <p className="vq-stat-lbl">Bekleyen Talep</p>
     </div>
    </div>
    <div className="vq-stat vq-stat--indigo">
     <div className="vq-stat-icon"><Tag className="w-5 h-5" /></div>
     <div>
      <p className="vq-stat-val">{categories}</p>
      <p className="vq-stat-lbl">Kategori</p>
     </div>
    </div>
    <div className="vq-stat vq-stat--emerald">
     <div className="vq-stat-icon"><Star className="w-5 h-5" /></div>
     <div>
      <p className="vq-stat-val">{avgRating}</p>
      <p className="vq-stat-lbl">Ort. Puan</p>
     </div>
    </div>
    <div className={`vq-stat ${oldestDays > 7 ? 'vq-stat--rose' : 'vq-stat--sky'}`}>
     <div className="vq-stat-icon"><Calendar className="w-5 h-5" /></div>
     <div>
      <p className="vq-stat-val">{oldestDays}</p>
      <p className="vq-stat-lbl">En Eski (gün)</p>
     </div>
    </div>
   </div>

   {actionError && (
    <div className="vq-error vq-error--dismissible">
     <AlertCircle className="w-4 h-4" />
     <p>{actionError}</p>
     <button onClick={() => setActionError(null)} className="vq-error-close" aria-label="Kapat">×</button>
    </div>
   )}

   <div className="vq-list">
    {verifications.map(v => {
     const isProcessing = processingId === v.id;
     const isRejecting = showRejectForm === v.id;
     const daysSince = Math.floor((Date.now() - new Date(v.requestedAt).getTime()) / (1000 * 60 * 60 * 24));
     const isOld = daysSince > 7;
     return (
      <article key={v.id} className={`vq-card ${isOld ? 'vq-card--old' : ''}`}>
       <header className="vq-card-head">
        <div className="vq-card-info">
         <h4 className="vq-card-title">{v.placeName}</h4>
         <div className="vq-card-meta">
          <span className="vq-meta-pill">
           <Tag className="w-3 h-3" />
           {v.category}
          </span>
          <span className="vq-meta-pill vq-meta-pill--rating">
           <Star className="w-3 h-3" />
           {v.rating.toFixed(1)}
          </span>
          <span className={`vq-meta-date ${isOld ? 'vq-meta-date--old' : ''}`}>
           <Calendar className="w-3 h-3" />
           {new Date(v.requestedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
           {daysSince > 0 && <span>· {daysSince} gün önce</span>}
          </span>
         </div>
        </div>
       </header>

       {v.reason && (
        <div className="vq-card-reason">
         <strong>Talep gerekçesi:</strong>
         <p>{v.reason}</p>
        </div>
       )}

       {isRejecting && (
        <div className="vq-reject-form">
         <label htmlFor={`reject-${v.id}`} className="vq-reject-label">
          Reddetme Nedeni <span className="vq-reject-hint">(en az 10 karakter)</span>
         </label>
         <textarea
          id={`reject-${v.id}`}
          value={rejectReason[v.id] || ''}
          onChange={(e) => {
           setRejectReason({ ...rejectReason, [v.id]: e.target.value });
           if (rejectValidationError) setRejectValidationError(null);
          }}
          rows={3}
          className={`vq-reject-textarea ${rejectValidationError ? 'vq-reject-textarea--error' : ''}`}
          placeholder="Reddetme nedenini açıklayın…"
         />
         {rejectValidationError && (
          <p className="vq-reject-error">{rejectValidationError}</p>
         )}
        </div>
       )}

       <footer className="vq-card-foot">
        <button
         onClick={() => handleApprove(v.id)}
         disabled={isProcessing}
         className="vq-btn vq-btn--approve"
         type="button"
        >
         {isProcessing ? '…' : <Check className="w-3.5 h-3.5" />}
         <span>{isProcessing ? 'İşleniyor' : 'Onayla'}</span>
        </button>
        {isRejecting ? (
         <>
          <button
           onClick={() => handleReject(v.id)}
           disabled={isProcessing}
           className="vq-btn vq-btn--reject"
           type="button"
          >
           {isProcessing ? '…' : <X className="w-3.5 h-3.5" />}
           <span>{isProcessing ? 'İşleniyor' : 'Reddet'}</span>
          </button>
          <button
           onClick={() => { setShowRejectForm(null); setRejectValidationError(null); }}
           disabled={isProcessing}
           className="vq-btn vq-btn--cancel"
           type="button"
          >
           İptal
          </button>
         </>
        ) : (
         <button
          onClick={() => setShowRejectForm(v.id)}
          disabled={isProcessing}
          className="vq-btn vq-btn--reject-init"
          type="button"
         >
          <X className="w-3.5 h-3.5" />
          <span>Reddet</span>
         </button>
        )}
       </footer>
      </article>
     );
    })}
   </div>

   <style>{`
    .vq-page { display: flex; flex-direction: column; gap: 1.25rem; }

    .vq-stats {
     display: grid;
     grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
     gap: 1rem;
    }
    .vq-stat {
     display: flex; align-items: center; gap: 0.95rem;
     padding: 1.05rem 1.2rem;
     background: var(--adm-bg-elev);
     border: 1px solid var(--adm-border);
     border-radius: 12px;
     position: relative;
     overflow: hidden;
    }
    .vq-stat::before {
     content: '';
     position: absolute; inset: 0;
     background: radial-gradient(circle at 100% 0%, var(--vq-c) 0%, transparent 55%);
     opacity: 0.06;
     pointer-events: none;
    }
    .vq-stat--amber { --vq-c: rgb(180,83,9); }
    .vq-stat--indigo { --vq-c: rgb(99,102,241); }
    .vq-stat--emerald { --vq-c: rgb(5,150,105); }
    .vq-stat--rose { --vq-c: rgb(190,18,60); }
    .vq-stat--sky { --vq-c: rgb(2,132,199); }
    .vq-stat-icon {
     width: 40px; height: 40px;
     border-radius: 10px;
     background: color-mix(in srgb, var(--vq-c) 12%, transparent);
     color: var(--vq-c);
     display: inline-flex; align-items: center; justify-content: center;
     flex-shrink: 0;
     position: relative;
    }
    .vq-stat-val {
     font-family: 'Cormorant Garamond', serif;
     font-size: 1.8rem; font-weight: 700;
     color: var(--adm-text);
     line-height: 1;
     margin: 0;
     position: relative;
    }
    .vq-stat-lbl {
     font-size: 0.78rem; font-weight: 600;
     color: var(--adm-text-muted);
     margin: 0.3rem 0 0;
    }

    .vq-skel-stat {
     height: 84px;
     background: var(--adm-bg-elev);
     border: 1px solid var(--adm-border);
     border-radius: 12px;
     position: relative;
     overflow: hidden;
    }
    .vq-skel-stat::after, .vq-skel-card::after {
     content: '';
     position: absolute; inset: 0;
     background: linear-gradient(90deg, transparent, var(--adm-bg-hover), transparent);
     animation: vqShimmer 1.4s infinite;
    }
    .vq-skel-card {
     height: 140px;
     background: var(--adm-bg-elev);
     border: 1px solid var(--adm-border);
     border-radius: 12px;
     position: relative;
     overflow: hidden;
    }
    @keyframes vqShimmer {
     from { transform: translateX(-100%); }
     to { transform: translateX(100%); }
    }

    .vq-error {
     display: flex; gap: 0.75rem; align-items: flex-start;
     padding: 0.85rem 1rem;
     background: rgba(225,29,72,0.08);
     border: 1px solid rgba(225,29,72,0.25);
     border-radius: 10px;
     color: rgb(190,18,60);
    }
    .vq-error p { margin: 0; font-size: 0.86rem; flex: 1; }
    .vq-error--dismissible { align-items: center; }
    .vq-error-close {
     background: transparent;
     border: none;
     color: rgb(190,18,60);
     font-size: 1.4rem;
     line-height: 1;
     cursor: pointer;
     padding: 0 0.4rem;
    }

    .vq-list {
     display: flex; flex-direction: column;
     gap: 0.85rem;
    }

    .vq-card {
     background: var(--adm-bg-elev);
     border: 1px solid var(--adm-border);
     border-radius: 12px;
     padding: 1.15rem 1.25rem;
     transition: border-color 0.15s, transform 0.15s;
    }
    .vq-card:hover {
     border-color: rgba(184,115,51,0.35);
     transform: translateY(-1px);
    }
    .vq-card--old { border-left: 3px solid rgb(190,18,60); }

    .vq-card-head {
     margin-bottom: 0.85rem;
    }
    .vq-card-info { display: flex; flex-direction: column; gap: 0.5rem; }
    .vq-card-title {
     font-size: 1.05rem; font-weight: 700;
     color: var(--adm-text);
     margin: 0;
    }
    .vq-card-meta {
     display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem;
    }
    .vq-meta-pill {
     display: inline-flex; align-items: center; gap: 0.25rem;
     padding: 0.22rem 0.6rem;
     background: var(--adm-bg-active);
     color: var(--adm-text-muted);
     border-radius: 999px;
     font-size: 0.74rem; font-weight: 600;
    }
    .vq-meta-pill--rating {
     background: rgba(217,119,6,0.12);
     color: rgb(180,83,9);
    }
    .vq-meta-date {
     display: inline-flex; align-items: center; gap: 0.25rem;
     font-size: 0.74rem;
     color: var(--adm-text-soft);
    }
    .vq-meta-date span { margin-left: 0.15rem; opacity: 0.85; }
    .vq-meta-date--old { color: rgb(190,18,60); font-weight: 600; }

    .vq-card-reason {
     margin-bottom: 0.85rem;
     padding: 0.7rem 0.85rem;
     background: var(--adm-bg);
     border-left: 3px solid var(--adm-accent);
     border-radius: 0 6px 6px 0;
    }
    .vq-card-reason strong {
     display: block;
     font-size: 0.74rem;
     font-weight: 700;
     color: var(--adm-accent);
     text-transform: uppercase;
     letter-spacing: 0.04em;
     margin-bottom: 0.25rem;
    }
    .vq-card-reason p {
     margin: 0;
     font-size: 0.86rem;
     color: var(--adm-text);
     line-height: 1.55;
    }

    .vq-reject-form {
     margin-bottom: 0.85rem;
     padding: 0.85rem 1rem;
     background: var(--adm-bg-hover);
     border: 1px solid var(--adm-border);
     border-radius: 8px;
    }
    .vq-reject-label {
     display: block;
     font-size: 0.82rem; font-weight: 600;
     color: var(--adm-text);
     margin-bottom: 0.4rem;
    }
    .vq-reject-hint {
     font-weight: 500;
     color: var(--adm-text-soft);
     font-size: 0.74rem;
    }
    .vq-reject-textarea {
     width: 100%;
     padding: 0.55rem 0.75rem;
     background: var(--adm-bg);
     border: 1px solid var(--adm-border);
     border-radius: 8px;
     font-size: 0.88rem;
     font-family: inherit;
     color: var(--adm-text);
     resize: vertical;
    }
    .vq-reject-textarea:focus {
     outline: none;
     border-color: var(--adm-accent);
     box-shadow: 0 0 0 3px rgba(184,115,51,0.12);
    }
    .vq-reject-textarea--error {
     border-color: rgb(190,18,60);
     box-shadow: 0 0 0 3px rgba(225,29,72,0.12);
    }
    .vq-reject-error {
     font-size: 0.78rem;
     color: rgb(190,18,60);
     margin: 0.4rem 0 0;
    }

    .vq-card-foot {
     display: flex; gap: 0.5rem; flex-wrap: wrap;
     padding-top: 0.5rem;
     border-top: 1px dashed var(--adm-border);
    }
    .vq-btn {
     display: inline-flex; align-items: center; gap: 0.35rem;
     padding: 0.5rem 0.95rem;
     font-size: 0.82rem; font-weight: 600;
     border-radius: 8px;
     border: 1px solid transparent;
     cursor: pointer;
     transition: all 0.15s;
    }
    .vq-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .vq-btn--approve {
     background: linear-gradient(135deg, rgb(16,185,129), rgb(5,150,105));
     color: #fff;
    }
    .vq-btn--approve:not(:disabled):hover { transform: translateY(-1px); filter: brightness(0.95); }
    .vq-btn--reject-init {
     background: transparent;
     color: rgb(190,18,60);
     border-color: rgba(225,29,72,0.3);
    }
    .vq-btn--reject-init:not(:disabled):hover {
     background: rgba(225,29,72,0.08);
     border-color: rgb(190,18,60);
    }
    .vq-btn--reject {
     background: linear-gradient(135deg, rgb(225,29,72), rgb(190,18,60));
     color: #fff;
    }
    .vq-btn--reject:not(:disabled):hover { transform: translateY(-1px); filter: brightness(0.95); }
    .vq-btn--cancel {
     background: var(--adm-bg);
     color: var(--adm-text-muted);
     border-color: var(--adm-border);
    }
    .vq-btn--cancel:not(:disabled):hover { border-color: var(--adm-text-muted); color: var(--adm-text); }

    .vq-empty {
     padding: 3rem 1rem;
     text-align: center;
     background: var(--adm-bg-elev);
     border: 1px dashed var(--adm-border);
     border-radius: 12px;
     display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
    }
    .vq-empty-icon {
     color: rgb(5,150,105);
     width: 56px !important; height: 56px !important;
     padding: 14px;
     background: rgba(16,185,129,0.12);
     border-radius: 50%;
     margin-bottom: 0.85rem;
     box-sizing: border-box;
    }
    .vq-empty-title {
     font-family: 'Cormorant Garamond', serif;
     font-size: 1.4rem; font-weight: 700;
     color: var(--adm-text);
     margin: 0 0 0.3rem;
    }
    .vq-empty-desc {
     font-size: 0.88rem;
     color: var(--adm-text-muted);
     margin: 0;
     max-width: 28rem;
     line-height: 1.55;
    }
   `}</style>
  </div>
 );
}

// Default export for compatibility
export default AdminVerificationQueue;
