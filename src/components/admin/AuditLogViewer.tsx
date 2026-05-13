import { useState, useEffect } from 'react';
interface AuditLog {
 id: string;
 userId: string;
 action: string;
 resourceType: string;
 resourceId: string;
 changes?: Record<string, any>;
 ipAddress: string;
 userAgent: string;
 createdAt: string;
 severity?: string;
}

export default function AuditLogViewer() {
 const [logs, setLogs] = useState<AuditLog[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [page, setPage] = useState(1);
 const [totalPages, setTotalPages] = useState(1);
 const [searchQuery, setSearchQuery] = useState('');
 const [actionFilter, setActionFilter] = useState('');
 const [resourceFilter, setResourceFilter] = useState('');

 useEffect(() => {
 loadLogs();
 }, [page, searchQuery, actionFilter, resourceFilter]);

 const loadLogs = async () => {
 try {
 setIsLoading(true);
 const params = new URLSearchParams();
 params.set('page', page.toString());
 params.set('limit', '20');
 if (searchQuery) params.set('search', searchQuery);
 if (actionFilter) params.set('action', actionFilter);
 if (resourceFilter) params.set('resource', resourceFilter);

 const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
 if (!res.ok) throw new Error('Denetim kayıtları yüklenemedi');

 const data = await res.json();
 setLogs(data.logs || []);
 setTotalPages(Math.ceil((data.total || 0) / 20));
 setError(null);
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Bir hata oluştu');
 } finally {
 setIsLoading(false);
 }
 };

 const severityClass = (action: string) => {
 if (action.includes('delete') || action.includes('remove')) return 'bg-[rgba(239,68,68,0.1)] text-red-300 ';
 if (action.includes('create') || action.includes('add')) return 'bg-[rgba(34,197,94,0.12)] text-green-400 ';
 if (action.includes('update') || action.includes('edit')) return 'bg-[rgba(59,130,246,0.1)] text-blue-300 ';
 return 'bg-[var(--adm-bg-hover)] text-[var(--adm-text)] #4A3828]';
 };

 return (
 <div className="container-custom py-8">
 {/* Header */}
 <div className="mb-8">
 <h1 className="text-3xl font-bold text-[var(--adm-text)] mb-2">Denetim Kayıtları</h1>
 <p className="text-[var(--adm-text-muted)]">Sistem aktivitesi ve değişiklikleri izle</p>
 </div>

 {/* Filters */}
 <div className="bg-[var(--adm-bg-elev)] rounded-sm shadow border border-[var(--adm-border)] p-6 mb-6">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {/* Search */}
 <div>
 <label className="block text-sm font-medium text-[var(--adm-text-muted)] mb-2">Ara</label>
 <input
 type="text"
 placeholder="Kullanıcı ID, kaynak ID..."
 value={searchQuery}
 onChange={(e) => {
 setSearchQuery(e.target.value);
 setPage(1);
 }}
 className="w-full px-3 py-2 border border-[var(--adm-border-strong)] rounded-sm bg-[var(--adm-bg-elev)] text-[var(--adm-text)]"
 />
 </div>

 {/* Action Filter */}
 <div>
 <label className="block text-sm font-medium text-[var(--adm-text-muted)] mb-2">İşlem</label>
 <select
 value={actionFilter}
 onChange={(e) => {
 setActionFilter(e.target.value);
 setPage(1);
 }}
 className="w-full px-3 py-2 border border-[var(--adm-border-strong)] rounded-sm bg-[var(--adm-bg-elev)] text-[var(--adm-text)]"
 >
 <option value="">Tüm işlemler</option>
 <option value="create">Oluştur</option>
 <option value="update">Güncelle</option>
 <option value="delete">Sil</option>
 <option value="login">Giriş</option>
 <option value="logout">Çıkış</option>
 </select>
 </div>

 {/* Resource Filter */}
 <div>
 <label className="block text-sm font-medium text-[var(--adm-text-muted)] mb-2">Kaynak Türü</label>
 <select
 value={resourceFilter}
 onChange={(e) => {
 setResourceFilter(e.target.value);
 setPage(1);
 }}
 className="w-full px-3 py-2 border border-[var(--adm-border-strong)] rounded-sm bg-[var(--adm-bg-elev)] text-[var(--adm-text)]"
 >
 <option value="">Tüm kaynaklar</option>
 <option value="users">Kullanıcılar</option>
 <option value="places">Yerler</option>
 <option value="reviews">Yorumlar</option>
 <option value="admin">Admin İşlemleri</option>
 </select>
 </div>
 </div>
 </div>

 {/* Error Message */}
 {error && (
 <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] rounded-sm p-4 text-red-300 mb-6">
 {error}
 </div>
 )}

 {/* Logs Table */}
 <div className="bg-[var(--adm-bg-elev)] rounded-sm shadow border border-[var(--adm-border)] overflow-hidden">
 {isLoading ? (
 <div className="p-8 text-center text-[var(--adm-text-muted)]">Yükleniyor…</div>
 ) : logs.length > 0 ? (
 <>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-[var(--adm-bg-hover)] border-b border-[var(--adm-border)]">
 <tr className="text-left text-sm text-[var(--adm-text-muted)] font-semibold">
 <th className="px-6 py-3">Tarih/Saat</th>
 <th className="px-6 py-3">Kullanıcı</th>
 <th className="px-6 py-3">İşlem</th>
 <th className="px-6 py-3">Kaynak</th>
 <th className="px-6 py-3">IP Adresi</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[var(--adm-border)]">
 {logs.map((log) => (
 <tr key={log.id} className="hover:bg-[var(--adm-bg-hover)] transition-colors">
 <td className="px-6 py-4 text-sm text-[var(--adm-text-muted)] whitespace-nowrap">
 {new Date(log.createdAt).toLocaleString('tr-TR')}
 </td>
 <td className="px-6 py-4 text-sm text-[var(--adm-text)] font-mono">
 {log.userId || '-'}
 </td>
 <td className="px-6 py-4 text-sm">
 <span className={`px-3 py-1 rounded-full text-xs font-semibold ${severityClass(log.action)}`}>
 {log.action}
 </span>
 </td>
 <td className="px-6 py-4 text-sm text-[var(--adm-text)]">
 <div>
 <div className="font-semibold">{log.resourceType}</div>
 <div className="text-xs text-[var(--adm-text-muted)] #7A6B58] font-mono">{log.resourceId}</div>
 </div>
 </td>
 <td className="px-6 py-4 text-sm text-[var(--adm-text-muted)] font-mono text-xs">
 {log.ipAddress}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* Pagination */}
 {totalPages > 1 && (
 <div className="px-6 py-4 border-t border-[var(--adm-border)] flex items-center justify-between">
 <div className="text-sm text-[var(--adm-text-muted)]">
 Sayfa {page} / {totalPages}
 </div>
 <div className="flex gap-2">
 <button
 onClick={() => setPage(Math.max(1, page - 1))}
 disabled={page === 1}
 className="px-3 py-2 border border-[var(--adm-border-strong)] rounded-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--adm-bg-hover)] "
 >
 Önceki
 </button>
 <button
 onClick={() => setPage(Math.min(totalPages, page + 1))}
 disabled={page === totalPages}
 className="px-3 py-2 border border-[var(--adm-border-strong)] rounded-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--adm-bg-hover)] "
 >
 Sonraki
 </button>
 </div>
 </div>
 )}
 </>
 ) : (
 <div className="p-8 text-center text-[var(--adm-text-muted)]">
 Kayıt bulunamadı
 </div>
 )}
 </div>
 </div>
 );
}
