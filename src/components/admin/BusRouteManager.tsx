import { useEffect, useState } from 'react';

interface BusRoute {
 id: number;
 route_no: string;
 name: string;
 start_stop: string | null;
 end_stop: string | null;
 notes: string | null;
 is_active: boolean;
 weekday_count: string;
 weekend_count: string;
}

interface BusSchedule {
 id: number;
 route_id: number;
 day_type: 'weekday' | 'weekend';
 direction: 'outbound' | 'inbound';
 departure_time: string;
}

type Tab = 'list' | 'add' | 'schedule';

export default function BusRouteManager() {
 const [routes, setRoutes] = useState<BusRoute[]>([]);
 const [tab, setTab] = useState<Tab>('list');
 const [saving, setSaving] = useState(false);
 const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
 const [loading, setLoading] = useState(true);

 // Add route form
 const [newRoute, setNewRoute] = useState({ route_no: '', name: '', start_stop: '', end_stop: '', notes: '' });

 // Schedule editor state
 const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null);
 const [schedules, setSchedules] = useState<BusSchedule[]>([]);
 const [dayType, setDayType] = useState<'weekday' | 'weekend'>('weekday');
 const [direction, setDirection] = useState<'outbound' | 'inbound'>('outbound');
 const [bulkTimes, setBulkTimes] = useState('');

 useEffect(() => { loadRoutes(); }, []);

 async function loadRoutes() {
 setLoading(true);
 try {
 const res = await fetch('/api/admin/bus-routes');
 const data = await res.json();
 if (data.success) setRoutes(data.routes);
 } finally { setLoading(false); }
 }

 async function loadSchedules(route: BusRoute) {
 setSelectedRoute(route);
 setTab('schedule');
 const res = await fetch(`/api/admin/bus-routes?routeId=${route.id}`);
 const data = await res.json();
 if (data.success) {
 setSchedules(data.schedules);
 const relevant = data.schedules
 .filter((s: BusSchedule) => s.day_type === dayType && s.direction === direction)
 .map((s: BusSchedule) => s.departure_time.slice(0, 5))
 .join('\n');
 setBulkTimes(relevant);
 }
 }

 useEffect(() => {
 if (!selectedRoute) return;
 const relevant = schedules
 .filter(s => s.day_type === dayType && s.direction === direction)
 .map(s => s.departure_time.slice(0, 5))
 .join('\n');
 setBulkTimes(relevant);
 }, [dayType, direction, schedules]);

 async function addRoute() {
 if (!newRoute.route_no || !newRoute.name) { setMsg({ type: 'err', text: 'Hat no ve adı zorunlu.' }); return; }
 setSaving(true); setMsg(null);
 try {
 const res = await fetch('/api/admin/bus-routes', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ action: 'add_route', ...newRoute }),
 });
 const data = await res.json();
 if (data.success) {
 setMsg({ type: 'ok', text: 'Hat eklendi.' });
 setNewRoute({ route_no: '', name: '', start_stop: '', end_stop: '', notes: '' });
 loadRoutes();
 setTab('list');
 } else throw new Error(data.error);
 } catch (e) {
 setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Hat eklenemedi.' });
 } finally { setSaving(false); }
 }

 async function toggleRoute(routeId: number) {
 await fetch('/api/admin/bus-routes', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ action: 'toggle_route', routeId }),
 });
 loadRoutes();
 }

 async function saveBulkSchedules() {
 if (!selectedRoute) return;
 const times = bulkTimes.split('\n').map(t => t.trim()).filter(t => /^\d{2}:\d{2}$/.test(t));
 setSaving(true); setMsg(null);
 try {
 const res = await fetch('/api/admin/bus-routes', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ action: 'bulk_schedules', routeId: selectedRoute.id, day_type: dayType, direction, times }),
 });
 const data = await res.json();
 if (data.success) {
 setMsg({ type: 'ok', text: data.message });
 const updated = await fetch(`/api/admin/bus-routes?routeId=${selectedRoute.id}`);
 const uData = await updated.json();
 if (uData.success) setSchedules(uData.schedules);
 } else throw new Error(data.error);
 } catch (e) {
 setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Saatler kaydedilemedi.' });
 } finally { setSaving(false); }
 }

 const tabCls = (t: string) =>
 `px-4 py-2 text-sm font-medium rounded-sm transition-colors ${tab === t ? 'bg-[var(--bg-card)] shadow text-[#1F1410]' : 'text-[#7A6B58] hover:text-[#7A6B58]'}`;

 return (
 <div className="space-y-6">
 <div className="bg-[var(--bg-card)] rounded-sm p-6">
 <h1 className="text-2xl font-bold text-[#1F1410]">Otobüs Hat Yönetimi</h1>
 <p className="text-[#7A6B58] mt-1">Hat ekle, sefer saatlerini düzenle, aktif/pasif yönet.</p>
 </div>

 {msg && (
 <div className={`px-4 py-3 rounded-sm text-sm flex justify-between ${msg.type === 'ok' ? 'bg-[rgba(34,197,94,0.08)] text-green-400 border border-[rgba(34,197,94,0.2)]' : 'bg-[rgba(239,68,68,0.1)] text-red-400 border border-[rgba(239,68,68,0.25)]'}`}>
 <span>{msg.text}</span>
 <button onClick={() => setMsg(null)}>✕</button>
 </div>
 )}

 <div className="bg-[rgba(184,115,51,0.06)] p-1 rounded-sm inline-flex gap-1 flex-wrap">
 <button onClick={() => setTab('list')} className={tabCls('list')}>🚌 Hatlar</button>
 <button onClick={() => setTab('add')} className={tabCls('add')}>➕ Hat Ekle</button>
 {selectedRoute && (
 <button onClick={() => setTab('schedule')} className={tabCls('schedule')}>
 🕐 {selectedRoute.route_no} Saatleri
 </button>
 )}
 </div>

 {/* LIST TAB */}
 {tab === 'list' && (
 <div className="bg-[var(--bg-card)] rounded-sm overflow-hidden">
 {loading ? (
 <div className="text-center py-10 text-[#4A3828]">Yükleniyor…</div>
 ) : routes.length === 0 ? (
 <div className="text-center py-10 text-[#4A3828]">
 <p className="mb-2">Henüz hat yok.</p>
 <button onClick={() => setTab('add')} className="text-[#7A6B58] underline text-sm">Hat ekleyin</button>
 </div>
 ) : (
 <table className="w-full text-sm">
 <thead className="bg-[rgba(184,115,51,0.04)] border-b border-[rgba(184,115,51,0.14)]">
 <tr>
 <th className="text-left px-4 py-3 font-medium text-[#7A6B58]">Hat</th>
 <th className="text-left px-4 py-3 font-medium text-[#7A6B58] hidden sm:table-cell">Güzergah</th>
 <th className="text-left px-4 py-3 font-medium text-[#7A6B58]">Sefer</th>
 <th className="text-left px-4 py-3 font-medium text-[#7A6B58]">Durum</th>
 <th className="text-left px-4 py-3 font-medium text-[#7A6B58]">İşlem</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[rgba(184,115,51,0.1)]">
 {routes.map(r => (
 <tr key={r.id} className="hover:bg-[rgba(184,115,51,0.04)]">
 <td className="px-4 py-3">
 <span className="font-bold text-red-600 text-base">{r.route_no}</span>
 <p className="text-xs text-[#7A6B58]">{r.name}</p>
 </td>
 <td className="px-4 py-3 text-[#7A6B58] hidden sm:table-cell text-xs">
 {r.start_stop && r.end_stop ? `${r.start_stop} → ${r.end_stop}` : '—'}
 </td>
 <td className="px-4 py-3 text-[#7A6B58] text-xs">
 <span className="block">İş: {r.weekday_count}</span>
 <span className="block">HY: {r.weekend_count}</span>
 </td>
 <td className="px-4 py-3">
 <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.is_active ? 'bg-[rgba(34,197,94,0.12)] text-green-400' : 'bg-[rgba(184,115,51,0.06)] text-[#7A6B58]'}`}>
 {r.is_active ? 'Aktif' : 'Pasif'}
 </span>
 </td>
 <td className="px-4 py-3 space-x-2">
 <button
 onClick={() => loadSchedules(r)}
 className="text-xs text-[#7A6B58] hover:underline"
 >
 Saatler
 </button>
 <button
 onClick={() => toggleRoute(r.id)}
 className="text-xs text-[#7A6B58] hover:underline"
 >
 {r.is_active ? 'Pasif Yap' : 'Aktif Yap'}
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </div>
 )}

 {/* ADD TAB */}
 {tab === 'add' && (
 <div className="bg-[var(--bg-card)] rounded-sm p-6 max-w-lg">
 <h2 className="text-lg font-semibold text-[#1F1410] mb-5">Yeni Hat Ekle</h2>
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-sm font-medium text-[#7A6B58] mb-1">Hat No *</label>
 <input
 type="text"
 value={newRoute.route_no}
 onChange={e => setNewRoute(f => ({ ...f, route_no: e.target.value }))}
 placeholder="Örn: 12"
 className="w-full rounded-sm border border-[rgba(184,115,51,0.25)] px-3 py-2 text-sm bg-[var(--bg-card)] text-[#1F1410] focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-[#7A6B58] mb-1">Hat Adı *</label>
 <input
 type="text"
 value={newRoute.name}
 onChange={e => setNewRoute(f => ({ ...f, name: e.target.value }))}
 placeholder="Örn: Karaköprü - Merkez"
 className="w-full rounded-sm border border-[rgba(184,115,51,0.25)] px-3 py-2 text-sm bg-[var(--bg-card)] text-[#1F1410] focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-sm font-medium text-[#7A6B58] mb-1">Başlangıç Durağı</label>
 <input
 type="text"
 value={newRoute.start_stop}
 onChange={e => setNewRoute(f => ({ ...f, start_stop: e.target.value }))}
 placeholder="Örn: Karaköprü"
 className="w-full rounded-sm border border-[rgba(184,115,51,0.25)] px-3 py-2 text-sm bg-[var(--bg-card)] text-[#1F1410] focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-[#7A6B58] mb-1">Bitiş Durağı</label>
 <input
 type="text"
 value={newRoute.end_stop}
 onChange={e => setNewRoute(f => ({ ...f, end_stop: e.target.value }))}
 placeholder="Örn: Topçu Meydanı"
 className="w-full rounded-sm border border-[rgba(184,115,51,0.25)] px-3 py-2 text-sm bg-[var(--bg-card)] text-[#1F1410] focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 </div>
 </div>
 <div>
 <label className="block text-sm font-medium text-[#7A6B58] mb-1">Notlar</label>
 <input
 type="text"
 value={newRoute.notes}
 onChange={e => setNewRoute(f => ({ ...f, notes: e.target.value }))}
 placeholder="Opsiyonel"
 className="w-full rounded-sm border border-[rgba(184,115,51,0.25)] px-3 py-2 text-sm bg-[var(--bg-card)] text-[#1F1410] focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 </div>
 <button
 onClick={addRoute}
 disabled={saving}
 className="px-5 py-2.5 bg-urfa-600 text-white font-medium rounded-sm hover:bg-urfa-700 disabled:opacity-50"
 >
 {saving ? 'Ekleniyor…' : 'Hat Ekle'}
 </button>
 </div>
 </div>
 )}

 {/* SCHEDULE TAB */}
 {tab === 'schedule' && selectedRoute && (
 <div className="bg-[var(--bg-card)] rounded-sm p-6 max-w-lg">
 <h2 className="text-lg font-semibold text-[#1F1410] mb-1">
 Hat {selectedRoute.route_no} — {selectedRoute.name}
 </h2>
 <p className="text-sm text-[#7A6B58] mb-5">Her satıra bir sefer saati (HH:MM). Kaydettiğinizde bu kombinasyon için tüm saatler güncellenir.</p>

 <div className="flex gap-3 mb-4">
 <div>
 <label className="block text-xs font-medium text-[#7A6B58] mb-1">Gün Tipi</label>
 <select
 value={dayType}
 onChange={e => setDayType(e.target.value as 'weekday' | 'weekend')}
 className="rounded-sm border border-[rgba(184,115,51,0.25)] px-3 py-2 text-sm bg-[var(--bg-card)] text-[#1F1410] focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 >
 <option value="weekday">Hafta İçi</option>
 <option value="weekend">Hafta Sonu</option>
 </select>
 </div>
 <div>
 <label className="block text-xs font-medium text-[#7A6B58] mb-1">Yön</label>
 <select
 value={direction}
 onChange={e => setDirection(e.target.value as 'outbound' | 'inbound')}
 className="rounded-sm border border-[rgba(184,115,51,0.25)] px-3 py-2 text-sm bg-[var(--bg-card)] text-[#1F1410] focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 >
 <option value="outbound">Gidiş</option>
 <option value="inbound">Dönüş</option>
 </select>
 </div>
 </div>

 <div className="mb-4">
 <label className="block text-sm font-medium text-[#7A6B58] mb-1">Sefer Saatleri (her satıra bir saat)</label>
 <textarea
 value={bulkTimes}
 onChange={e => setBulkTimes(e.target.value)}
 rows={10}
 placeholder={"06:00\n06:30\n07:00\n..."}
 className="w-full rounded-sm border border-[rgba(184,115,51,0.25)] px-3 py-2 text-sm bg-[var(--bg-card)] text-[#1F1410] font-mono focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 <p className="text-xs text-[#4A3828] mt-1">
 {bulkTimes.split('\n').filter(t => /^\d{2}:\d{2}$/.test(t.trim())).length} geçerli saat
 </p>
 </div>

 <div className="flex gap-3">
 <button
 onClick={saveBulkSchedules}
 disabled={saving}
 className="px-5 py-2.5 bg-urfa-600 text-white font-medium rounded-sm hover:bg-urfa-700 disabled:opacity-50"
 >
 {saving ? 'Kaydediliyor…' : 'Saatleri Kaydet'}
 </button>
 <button
 onClick={() => setTab('list')}
 className="px-5 py-2.5 bg-[rgba(184,115,51,0.06)] text-[#7A6B58] font-medium rounded-sm hover:bg-[rgba(184,115,51,0.08)]"
 >
 Geri
 </button>
 </div>
 </div>
 )}
 </div>
 );
}
