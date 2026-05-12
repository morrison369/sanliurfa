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
 return 'bg-[rgba(184,115,51,0.06)] text-[#1F1410] #4A3828]';
 };

 return (
 <div className="container-custom py-8">
 {/* Header */}
 <div className="mb-8">
 <h1 className="text-3xl font-bold text-[#1F1410] mb-2">Denetim Kayıtları</h1>
 <p className="text-[#7A6B58]">Sistem aktivitesi ve değişiklikleri izle</p>
 </div>

 {/* Filters */}
 <div className="bg-[var(--bg-card)] rounded-sm shadow border border-[rgba(184,115,51,0.14)] p-6 mb-6">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {/* Search */}
 <div>
 <label className="block text-sm font-medium text-[#7A6B58] mb-2">Ara</label>
 <input
 type="text"
 placeholder="Kullanıcı ID, kaynak ID..."
 value={searchQuery}
 onChange={(e) => {
 setSearchQuery(e.target.value);
 setPage(1);
 }}
 className="w-full px-3 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm bg-[var(--bg-card)] text-[#1F1410]"
 />
 </div>

 {/* Action Filter */}
 <div>
 <label className="block text-sm font-medium text-[#7A6B58] mb-2">İşlem</label>
 <select
 value={actionFilter}
 onChange={(e) => {
 setActionFilter(e.target.value);
 setPage(1);
 }}
 className="w-full px-3 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm bg-[var(--bg-card)] text-[#1F1410]"
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
 <label className="block text-sm font-medium text-[#7A6B58] mb-2">Kaynak Türü</label>
 <select
 value={resourceFilter}
 onChange={(e) => {
 setResourceFilter(e.target.value);
 setPage(1);
 }}
 className="w-full px-3 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm bg-[var(--bg-card)] text-[#1F1410]"
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
 <div className="bg-[var(--bg-card)] rounded-sm shadow border border-[rgba(184,115,51,0.14)] overflow-hidden">
 {isLoading ? (
 <div className="p-8 text-center text-[#7A6B58]">Yükleniyor...</div>
 ) : logs.length > 0 ? (
 <>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-[rgba(184,115,51,0.04)] border-b border-[rgba(184,115,51,0.14)]">
 <tr className="text-left text-sm text-[#7A6B58] font-semibold">
 <th className="px-6 py-3">Tarih/Saat</th>
 <th className="px-6 py-3">Kullanıcı</th>
 <th className="px-6 py-3">İşlem</th>
 <th className="px-6 py-3">Kaynak</th>
 <th className="px-6 py-3">IP Adresi</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[rgba(184,115,51,0.14)]">
 {logs.map((log) => (
 <tr key={log.id} className="hover:bg-[rgba(184,115,51,0.04)] transition-colors">
 <td className="px-6 py-4 text-sm text-[#7A6B58] whitespace-nowrap">
 {new Date(log.createdAt).toLocaleString('tr-TR')}
 </td>
 <td className="px-6 py-4 text-sm text-[#1F1410] font-mono">
 {log.userId || '-'}
 </td>
 <td className="px-6 py-4 text-sm">
 <span className={`px-3 py-1 rounded-full text-xs font-semibold ${severityClass(log.action)}`}>
 {log.action}
 </span>
 </td>
 <td className="px-6 py-4 text-sm text-[#1F1410]">
 <div>
 <div className="font-semibold">{log.resourceType}</div>
 <div className="text-xs text-[#7A6B58] #7A6B58] font-mono">{log.resourceId}</div>
 </div>
 </td>
 <td className="px-6 py-4 text-sm text-[#7A6B58] font-mono text-xs">
 {log.ipAddress}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* Pagination */}
 {totalPages > 1 && (
 <div className="px-6 py-4 border-t border-[rgba(184,115,51,0.14)] flex items-center justify-between">
 <div className="text-sm text-[#7A6B58]">
 Sayfa {page} / {totalPages}
 </div>
 <div className="flex gap-2">
 <button
 onClick={() => setPage(Math.max(1, page - 1))}
 disabled={page === 1}
 className="px-3 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[rgba(184,115,51,0.04)] "
 >
 Önceki
 </button>
 <button
 onClick={() => setPage(Math.min(totalPages, page + 1))}
 disabled={page === totalPages}
 className="px-3 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[rgba(184,115,51,0.04)] "
 >
 Sonraki
 </button>
 </div>
 </div>
 )}
 </>
 ) : (
 <div className="p-8 text-center text-[#7A6B58]">
 Kayıt bulunamadı
 </div>
 )}
 </div>
 </div>
 );
}
