import { useState, useEffect} from 'react';

interface Report {
 id: string;
 reporter_id: string;
 reported_user_id?: string;
 content_type: string;
 content_id: string;
 reason: string;
 description?: string;
 status: string;
 created_at: string;
}

interface Stats {
 pending_reports: number;
 in_review_reports: number;
 resolved_reports: number;
 active_bans: number;
 total_warnings: number;
 queue_items: number;
}

export default function ModerationDashboard() {
 const [stats, setStats] = useState<Stats | null>(null);
 const [reports, setReports] = useState<Report[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [selectedTab, setSelectedTab] = useState<'overview' | 'reports' | 'actions'>('overview');
 const [reportFilter, setReportFilter] = useState<'pending' | 'under_review' | 'resolved' | 'all'>('pending');
 const [actionModal, setActionModal] = useState<{ isOpen: boolean; reportId?: string }>({ isOpen: false });
 const [actionForm, setActionForm] = useState({
 report_id: '',
 target_user_id: '',
 action_type: 'warning',
 reason: '',
 duration_days: 7
 });

 useEffect(() => {
 loadData();
 }, [reportFilter]);

 const loadData = async () => {
 try {
 setIsLoading(true);
 setError(null);

 const statsRes = await fetch('/api/admin/moderation/stats');
 if (statsRes.ok) {
 const statsData = await statsRes.json();
 setStats(statsData.data.stats);
 }

 const reportsRes = await fetch(
 `/api/admin/moderation/reports?status=${reportFilter === 'all' ? '' : reportFilter}`
 );
 if (reportsRes.ok) {
 const reportsData = await reportsRes.json();
 setReports(reportsData.data);
 }
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Bir hata oluştu');
 } finally {
 setIsLoading(false);
 }
 };

 const handleActionSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
 e.preventDefault();
 if (!actionForm.report_id || !actionForm.target_user_id) {
 setError('Rapor ID ve kullanıcı ID gereklidir');
 return;
 }

 try {
 const response = await fetch('/api/admin/moderation/actions', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(actionForm)
 });

 if (!response.ok) {
 const data = await response.json();
 throw new Error(data.error || 'İşlem gerçekleştirilemedi');
 }

 setActionForm({
 report_id: '',
 target_user_id: '',
 action_type: 'warning',
 reason: '',
 duration_days: 7
 });
 setActionModal({ isOpen: false });
 await loadData();
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Bir hata oluştu');
 }
 };

 const handleReportStatusUpdate = async (reportId: string, newStatus: string) => {
 try {
 const response = await fetch(`/api/admin/moderation/reports?id=${reportId}`, {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 status: newStatus,
 resolution_note: 'Yönetici tarafından işlendi'
 })
 });

 if (!response.ok) {
 throw new Error('Durum güncellenemedi');
 }

 await loadData();
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Bir hata oluştu');
 }
 };

 if (isLoading) {
 return <div className="text-center py-8">Yükleniyor…</div>;
 }

 return (
 <div className="space-y-6">
 {/* Tab Navigation */}
 <div className="flex border-b border-[var(--adm-border)]">
 <button
 onClick={() => setSelectedTab('overview')}
 className={`px-4 py-2 font-medium border-b-2 transition-colors ${
 selectedTab === 'overview'
 ? 'border-urfa-500 text-[var(--adm-text-muted)]'
 : 'border-transparent text-[var(--adm-text-muted)]'
 }`}
 >
 Özet
 </button>
 <button
 onClick={() => setSelectedTab('reports')}
 className={`px-4 py-2 font-medium border-b-2 transition-colors ${
 selectedTab === 'reports'
 ? 'border-urfa-500 text-[var(--adm-text-muted)]'
 : 'border-transparent text-[var(--adm-text-muted)]'
 }`}
 >
 Raporlar
 </button>
 <button
 onClick={() => setSelectedTab('actions')}
 className={`px-4 py-2 font-medium border-b-2 transition-colors ${
 selectedTab === 'actions'
 ? 'border-urfa-500 text-[var(--adm-text-muted)]'
 : 'border-transparent text-[var(--adm-text-muted)]'
 }`}
 >
 İşlemler
 </button>
 </div>

 {error && (
 <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] rounded-sm text-red-400 text-sm">
 {error}
 </div>
 )}

 {/* Overview Tab */}
 {selectedTab === 'overview' && stats && (
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="bg-[var(--adm-bg-elev)] p-6 rounded-sm border border-[var(--adm-border)]">
 <div className="text-3xl font-bold text-red-600">{stats.pending_reports}</div>
 <div className="text-[var(--adm-text-muted)] text-sm">Beklemede Raporlar</div>
 </div>
 <div className="bg-[var(--adm-bg-elev)] p-6 rounded-sm border border-[var(--adm-border)]">
 <div className="text-3xl font-bold text-yellow-600">{stats.in_review_reports}</div>
 <div className="text-[var(--adm-text-muted)] text-sm">İncelemede Raporlar</div>
 </div>
 <div className="bg-[var(--adm-bg-elev)] p-6 rounded-sm border border-[var(--adm-border)]">
 <div className="text-3xl font-bold text-green-600">{stats.resolved_reports}</div>
 <div className="text-[var(--adm-text-muted)] text-sm">Çözümlenen Raporlar</div>
 </div>
 <div className="bg-[var(--adm-bg-elev)] p-6 rounded-sm border border-[var(--adm-border)]">
 <div className="text-3xl font-bold text-orange-600">{stats.active_bans}</div>
 <div className="text-[var(--adm-text-muted)] text-sm">Aktif Banlar</div>
 </div>
 <div className="bg-[var(--adm-bg-elev)] p-6 rounded-sm border border-[var(--adm-border)]">
 <div className="text-3xl font-bold text-[var(--adm-text-muted)]">{stats.total_warnings}</div>
 <div className="text-[var(--adm-text-muted)] text-sm">Toplam Uyarılar</div>
 </div>
 <div className="bg-[var(--adm-bg-elev)] p-6 rounded-sm border border-[var(--adm-border)]">
 <div className="text-3xl font-bold text-[#B87333]">{stats.queue_items}</div>
 <div className="text-[var(--adm-text-muted)] text-sm">Kuyrukta İtemler</div>
 </div>
 </div>
 )}

 {/* Reports Tab */}
 {selectedTab === 'reports' && (
 <div className="space-y-4">
 <div className="flex gap-2">
 {['all', 'pending', 'under_review', 'resolved'].map((status) => (
 <button
 key={status}
 onClick={() => setReportFilter(status as 'pending' | 'under_review' | 'resolved' | 'all')}
 className={`px-4 py-2 rounded-sm font-medium transition-colors ${
 reportFilter === status
 ? 'bg-urfa-600 text-white'
 : 'bg-[var(--adm-bg-hover)] text-[var(--adm-text-muted)]'
 }`}
 >
 {status === 'all' && 'Tümü'}
 {status === 'pending' && 'Beklemede'}
 {status === 'under_review' && 'İncelemede'}
 {status === 'resolved' && 'Çözümlenen'}
 </button>
 ))}
 </div>

 <div className="space-y-3">
 {reports.length === 0 ? (
 <div className="text-center py-8 text-[var(--adm-text-muted)]">
 Rapor bulunamadı
 </div>
 ) : (
 reports.map((report) => (
 <div key={report.id} className="bg-[var(--adm-bg-elev)] p-4 rounded-sm border border-[var(--adm-border)]">
 <div className="flex justify-between items-start mb-2">
 <div>
 <p className="font-medium text-[var(--adm-text)]">
 {report.content_type.charAt(0).toUpperCase() + report.content_type.slice(1)} - {report.reason}
 </p>
 <p className="text-sm text-[var(--adm-text-muted)]">
 {new Date(report.created_at).toLocaleString('tr-TR')}
 </p>
 </div>
 <span className={`px-3 py-1 rounded-full text-sm font-medium ${
 report.status === 'pending'
 ? 'bg-[rgba(239,68,68,0.1)] text-red-700 '
 : report.status === 'under_review'
 ? 'bg-[rgba(234,179,8,0.12)] text-yellow-400 '
 : 'bg-[rgba(34,197,94,0.12)] text-green-400 '
 }`}>
 {report.status === 'pending' && 'Beklemede'}
 {report.status === 'under_review' && 'İncelemede'}
 {report.status === 'resolved' && 'Çözümlendi'}
 </span>
 </div>
 {report.description && (
 <p className="text-sm text-[var(--adm-text-muted)] mb-3">{report.description}</p>
 )}
 <div className="flex gap-2">
 {report.status === 'pending' && (
 <>
 <button
 onClick={() => {
 setActionForm({
 ...actionForm,
 report_id: report.id,
 target_user_id: report.reported_user_id || ''
 });
 setActionModal({ isOpen: true, reportId: report.id });
 }}
 className="px-3 py-1 bg-urfa-600 text-white rounded text-sm hover:bg-urfa-700"
 >
 İşlem Al
 </button>
 <button
 onClick={() => handleReportStatusUpdate(report.id, 'under_review')}
 className="px-3 py-1 bg-urfa-600 text-white rounded text-sm hover:bg-urfa-700"
 >
 İncelemede İşaretle
 </button>
 </>
 )}
 {report.status === 'under_review' && (
 <button
 onClick={() => handleReportStatusUpdate(report.id, 'resolved')}
 className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
 >
 Çözümlendi İşaretle
 </button>
 )}
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 )}

 {/* Actions Modal */}
 {actionModal.isOpen && (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
 <div className="bg-[var(--adm-bg-elev)] rounded-sm shadow-xl max-w-md w-full p-6">
 <h3 className="text-lg font-semibold text-[var(--adm-text)] mb-4">
 Moderasyon İşlemi Al
 </h3>
 <form onSubmit={handleActionSubmit} className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-[var(--adm-text-muted)] mb-1">
 İşlem Tipi
 </label>
 <select
 value={actionForm.action_type}
 onChange={(e) => setActionForm({ ...actionForm, action_type: e.target.value })}
 className="w-full px-3 py-2 border border-[var(--adm-border-strong)] rounded-sm bg-[var(--adm-bg-elev)] text-[var(--adm-text)]"
 >
 <option value="warning">Uyarı</option>
 <option value="content_removed">İçeriği Kaldır</option>
 <option value="suspend">Askıya Al</option>
 <option value="ban">Ban</option>
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-[var(--adm-text-muted)] mb-1">
 Neden
 </label>
 <textarea
 value={actionForm.reason}
 onChange={(e) => setActionForm({ ...actionForm, reason: e.target.value })}
 maxLength={500}
 rows={3}
 className="w-full px-3 py-2 border border-[var(--adm-border-strong)] rounded-sm bg-[var(--adm-bg-elev)] text-[var(--adm-text)]"
 />
 </div>

 {['suspend', 'ban'].includes(actionForm.action_type) && (
 <div>
 <label className="block text-sm font-medium text-[var(--adm-text-muted)] mb-1">
 Gün Sayısı
 </label>
 <input
 type="number"
 min="1"
 max="365"
 value={actionForm.duration_days}
 onChange={(e) => setActionForm({ ...actionForm, duration_days: parseInt(e.target.value) })}
 className="w-full px-3 py-2 border border-[var(--adm-border-strong)] rounded-sm bg-[var(--adm-bg-elev)] text-[var(--adm-text)]"
 />
 </div>
 )}

 <div className="flex gap-3">
 <button
 type="button"
 onClick={() => setActionModal({ isOpen: false })}
 className="flex-1 px-4 py-2 border border-[var(--adm-border-strong)] rounded-sm hover:bg-[var(--adm-bg-hover)] "
 >
 İptal
 </button>
 <button
 type="submit"
 className="flex-1 px-4 py-2 bg-red-600 text-white rounded-sm hover:bg-red-700"
 >
 İşlemi Al
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
}
