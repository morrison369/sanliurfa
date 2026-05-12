import { useState, useEffect } from 'react';
interface Report {
 id: string;
 name: string;
 report_type?: string;
 format: string;
 is_active: boolean;
}

export default function ReportManager() {
 const [tab, setTab] = useState<'reports' | 'templates'>('reports');
 const [reports, setReports] = useState<Report[]>([]);
 const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [successMessage, setSuccessMessage] = useState<string | null>(null);
 const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'excel'>('csv');

 useEffect(() => {
 if (tab === 'reports') {
 loadReports();
 }
 }, [tab]);

 const loadReports = async () => {
 try {
 setLoading(true);
 setError(null);
 const response = await fetch('/api/reports');
 if (!response.ok) throw new Error('Raporlar yüklenemedi');
 const result = await response.json();
 setReports(result.data || []);
 if (result.data?.length > 0) {
 setSelectedReportId(result.data[0].id);
 }
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Raporlar yüklenirken hata oluştu');
 } finally {
 setLoading(false);
 }
 };

 const executeReport = async (reportId: string) => {
 try {
 setLoading(true);
 const endpoint = `/api/reports/${reportId}/execute`;
 const response = await fetch(endpoint, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ format: exportFormat })
 });
 if (!response.ok) throw new Error('Rapor çalıştırılamadı');
 const result = await response.json();
 setSuccessMessage(`Rapor çalıştırıldı: ${result.data.row_count} satır`);
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Hata');
 } finally {
 setLoading(false);
 }
 };

 const exportReport = async (reportId: string, fmt: string) => {
 try {
 const endpoint = `/api/reports/${reportId}/export?format=${fmt}`;
 const response = await fetch(endpoint);
 if (!response.ok) throw new Error('Dışa aktarma başarısız');
 const blob = await response.blob();
 const objUrl = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = objUrl;
 a.download = `report.${fmt}`;
 a.click();
 URL.revokeObjectURL(objUrl);
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Hata');
 }
 };

 return (
 <div className="space-y-6">
 <div className="flex space-x-2 border-b border-[rgba(184,115,51,0.14)]">
 <button
 onClick={() => setTab('reports')}
 className={`px-4 py-2 font-medium border-b-2 transition ${
 tab === 'reports' ? 'border-urfa-500 text-[#1F1410]' : 'border-transparent text-[#7A6B58]'
 }`}
 >
 📊 Raporlar
 </button>
 <button
 onClick={() => setTab('templates')}
 className={`px-4 py-2 font-medium border-b-2 transition ${
 tab === 'templates' ? 'border-urfa-500 text-[#1F1410]' : 'border-transparent text-[#7A6B58]'
 }`}
 >
 📋 Şablonlar
 </button>
 </div>

 {error && <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] rounded text-red-400">{error}</div>}
 {successMessage && (
 <div className="p-4 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.2)] rounded text-green-400 flex items-center justify-between">
 <span>{successMessage}</span>
 <button onClick={() => setSuccessMessage(null)} className="text-green-400 hover:text-green-600 ml-4 text-lg leading-none">×</button>
 </div>
 )}

 {tab === 'reports' && (
 <div className="space-y-4">
 <h2 className="text-2xl font-bold">Raporlar</h2>
 {loading ? (
 <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-[rgba(184,115,51,0.08)] animate-pulse rounded"></div>)}</div>
 ) : reports.length > 0 ? (
 <div className="space-y-3">
 {reports.map((r) => (
 <div
 key={r.id}
 className={`p-4 border rounded cursor-pointer ${
 selectedReportId === r.id ? 'bg-[rgba(59,130,246,0.1)] border-blue-500' : 'bg-[var(--bg-card)] border-[rgba(184,115,51,0.14)] hover:border-[rgba(184,115,51,0.25)]'
 }`}
 onClick={() => setSelectedReportId(r.id)}
 >
 <div className="flex justify-between items-start">
 <div>
 <p className="font-semibold">{r.name}</p>
 <p className="text-sm text-[#7A6B58]">{r.report_type} • {r.format}</p>
 </div>
 <span className={`text-xs px-2 py-1 rounded ${r.is_active ? 'bg-[rgba(34,197,94,0.12)] text-green-400' : 'bg-[rgba(184,115,51,0.06)] text-[#7A6B58]'}`}>
 {r.is_active ? 'Aktif' : 'Pasif'}
 </span>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-[#7A6B58]">Henüz rapor yok</p>
 )}

 {selectedReportId && (
 <div className="p-4 bg-[rgba(184,115,51,0.04)] rounded border">
 <h3 className="font-semibold mb-3">Dışa Aktarma Seçenekleri</h3>
 <div className="flex space-x-2">
 <select
 value={exportFormat}
 onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json' | 'excel')}
 className="px-3 py-2 border border-[rgba(184,115,51,0.25)] rounded"
 >
 <option value="csv">CSV</option>
 <option value="json">JSON</option>
 <option value="excel">Excel</option>
 </select>
 <button
 onClick={() => executeReport(selectedReportId)}
 disabled={loading}
 className="px-4 py-2 bg-urfa-600 text-white rounded hover:bg-urfa-700 disabled:opacity-50"
 >
 Çalıştır
 </button>
 <button
 onClick={() => exportReport(selectedReportId, exportFormat)}
 className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
 >
 İndir
 </button>
 </div>
 </div>
 )}
 </div>
 )}

 {tab === 'templates' && (
 <div className="space-y-4">
 <h2 className="text-2xl font-bold">Dışa Aktarma Şablonları</h2>
 <p className="text-[#7A6B58]">Özel dışa aktarma şablonlarınızı yönetin</p>
 </div>
 )}
 </div>
 );
}
