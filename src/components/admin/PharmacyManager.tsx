import { useEffect, useState } from 'react';

interface Pharmacy {
  id: number;
  name: string;
  address: string;
  phone: string | null;
  district_name: string | null;
  is_on_duty: boolean;
  duty_date: string | null;
}

interface District {
  id: number;
  name: string;
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
}

export default function PharmacyManager() {
  const [allPharmacies, setAllPharmacies] = useState<Pharmacy[]>([]);
  const [selectedDate, setSelectedDate] = useState(today());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [tab, setTab] = useState<'duty' | 'all' | 'add'>('duty');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [newForm, setNewForm] = useState({ name: '', address: '', phone: '', district_id: '' });
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
    loadDistricts();
  }, []);

  useEffect(() => {
    loadDuty(selectedDate);
  }, [selectedDate]);

  async function loadDuty(date: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/pharmacies?mode=duty&date=${date}`);
      const data = await res.json();
      if (data.success) {
        setSelectedIds(new Set(data.pharmacies.map((p: Pharmacy) => p.id)));
      }
    } finally { setLoading(false); }
  }

  async function loadAll() {
    const res = await fetch('/api/admin/pharmacies?mode=all');
    const data = await res.json();
    if (data.success) setAllPharmacies(data.pharmacies);
  }

  async function loadDistricts() {
    try {
      const res = await fetch('/api/admin/site?model=districts&limit=20');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setDistricts(data.data);
      }
    } catch { /* ilçe listesi opsiyonel */ }
  }

  function toggleId(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function saveDuty() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/pharmacies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_duty', date: selectedDate, pharmacyIds: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'ok', text: data.message });
        loadDuty(selectedDate);
      } else throw new Error(data.error);
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Hata oluştu.' });
    } finally { setSaving(false); }
  }

  async function addPharmacy() {
    if (!newForm.name || !newForm.address) { setMsg({ type: 'err', text: 'Ad ve adres zorunlu.' }); return; }
    setSaving(true);
    setMsg(null);
    try {
      const payload: { action: string; name: string; address: string; phone: string; district_id?: number } = {
        action: 'add', name: newForm.name, address: newForm.address, phone: newForm.phone,
        ...(newForm.district_id ? { district_id: parseInt(newForm.district_id) } : {}),
      };
      const res = await fetch('/api/admin/pharmacies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'ok', text: 'Eczane eklendi.' });
        setNewForm({ name: '', address: '', phone: '', district_id: '' });
        loadAll();
      } else throw new Error(data.error);
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Hata oluştu.' });
    } finally { setSaving(false); }
  }

  const tabCls = (t: string) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">Nöbetçi Eczane Yönetimi</h1>
        <p className="text-gray-500 mt-1">Günlük nöbetçi eczaneleri belirle, eczane ekle veya düzenle.</p>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-lg text-sm flex justify-between ${msg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)}>✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-gray-100 p-1 rounded-xl inline-flex gap-1">
        <button onClick={() => setTab('duty')} className={tabCls('duty')}>📋 Nöbet Ata</button>
        <button onClick={() => setTab('all')} className={tabCls('all')}>🏥 Tüm Eczaneler</button>
        <button onClick={() => setTab('add')} className={tabCls('add')}>➕ Eczane Ekle</button>
      </div>

      {/* DUTY TAB */}
      {tab === 'duty' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-wrap items-end gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nöbet Tarihi</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-sm text-gray-500 pb-2">{fmt(selectedDate)}</p>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Yükleniyor…</div>
          ) : allPharmacies.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-lg mb-2">Henüz eczane yok.</p>
              <button onClick={() => setTab('add')} className="text-blue-600 underline text-sm">Eczane ekleyin</button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-3">{selectedIds.size} eczane seçili (nöbetçi). İşaretlileri kaydet butonuyla onaylayın.</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {allPharmacies.map(p => {
                  const on = selectedIds.has(p.id);
                  return (
                    <label key={p.id} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${on ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="checkbox" checked={on} onChange={() => toggleId(p.id)} className="mt-1 h-4 w-4 accent-green-600" />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                        <p className="text-xs text-gray-500 truncate">{p.address}</p>
                        {p.phone && <p className="text-xs text-blue-600">{p.phone}</p>}
                        {p.district_name && <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded mt-1 inline-block">{p.district_name}</span>}
                      </div>
                    </label>
                  );
                })}
              </div>
              <button
                onClick={saveDuty}
                disabled={saving}
                className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Kaydediliyor…' : `${selectedDate} Nöbetçilerini Kaydet`}
              </button>
            </>
          )}
        </div>
      )}

      {/* ALL TAB */}
      {tab === 'all' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Eczane</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Adres</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Telefon</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">İlçe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allPharmacies.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell max-w-xs truncate">{p.address}</td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{p.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.district_name || '—'}</td>
                </tr>
              ))}
              {allPharmacies.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">Eczane bulunamadı</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ADD TAB */}
      {tab === 'add' && (
        <div className="bg-white rounded-xl shadow-sm p-6 max-w-lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Yeni Eczane Ekle</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Eczane Adı *</label>
              <input
                type="text"
                value={newForm.name}
                onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Örn: Güven Eczanesi"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adres *</label>
              <textarea
                value={newForm.address}
                onChange={e => setNewForm(f => ({ ...f, address: e.target.value }))}
                rows={2}
                placeholder="Mahalle, sokak, bina no..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input
                  type="tel"
                  value={newForm.phone}
                  onChange={e => setNewForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="0414 xxx xx xx"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">İlçe</label>
                <select
                  value={newForm.district_id}
                  onChange={e => setNewForm(f => ({ ...f, district_id: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seçin</option>
                  {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <button
              onClick={addPharmacy}
              disabled={saving}
              className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Ekleniyor…' : 'Eczane Ekle'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
