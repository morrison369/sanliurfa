import { useEffect, useMemo, useState, type ReactNode } from 'react';

type HomepageSectionRow = {
 id?: string;
 section_key: string;
 title: string;
 description?: string | null;
 config?: Record<string, any>;
 is_active: boolean;
 sort_order: number;
};

type ServiceEntryRow = {
 id?: string;
 service_key: string;
 service_group: string;
 title: string;
 slug: string;
 summary?: string | null;
 href: string;
 icon?: string | null;
 badge?: string | null;
 freshness_key?: string | null;
 payload?: Record<string, any>;
 is_active: boolean;
 sort_order: number;
};

type SeoOverrideRow = {
 id?: string;
 entity_type: string;
 entity_key: string;
 canonical_path: string;
 seo_payload?: Record<string, any>;
 is_active: boolean;
};

type PlatformPayload = {
 counts?: {
 homepageSections?: { total?: number; active?: number };
 serviceEntries?: { total?: number; active?: number };
 seoOverrides?: { total?: number; active?: number };
 mediaAssets?: number;
 mediaUsage?: number;
 };
};

const EMPTY_SECTION: HomepageSectionRow = {
 section_key: '',
 title: '',
 description: '',
 config: {},
 is_active: true,
 sort_order: 10,
};

const EMPTY_SERVICE: ServiceEntryRow = {
 service_key: '',
 service_group: 'city-services',
 title: '',
 slug: '',
 summary: '',
 href: '',
 icon: '',
 badge: '',
 freshness_key: '',
 payload: {},
 is_active: true,
 sort_order: 10,
};

const EMPTY_SEO: SeoOverrideRow = {
 entity_type: 'homepage',
 entity_key: 'home',
 canonical_path: '/',
 seo_payload: {},
 is_active: true,
};

export default function SitePlatformBlueprint() {
 const [payload, setPayload] = useState<PlatformPayload | null>(null);
 const [sections, setSections] = useState<HomepageSectionRow[]>([]);
 const [services, setServices] = useState<ServiceEntryRow[]>([]);
 const [seoOverrides, setSeoOverrides] = useState<SeoOverrideRow[]>([]);
 const [sectionDraft, setSectionDraft] = useState<HomepageSectionRow>(EMPTY_SECTION);
 const [serviceDraft, setServiceDraft] = useState<ServiceEntryRow>(EMPTY_SERVICE);
 const [seoDraft, setSeoDraft] = useState<SeoOverrideRow>(EMPTY_SEO);
 const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
 const [message, setMessage] = useState('');

 async function loadAll() {
 setStatus('loading');
 try {
 const [platformRes, sectionsRes, servicesRes, seoRes] = await Promise.all([
 fetch('/api/admin/site/platform'),
 fetch('/api/admin/site/homepage-sections'),
 fetch('/api/admin/site/services'),
 fetch('/api/admin/site/seo-overrides'),
 ]);

 const [platformJson, sectionsJson, servicesJson, seoJson] = await Promise.all([
 platformRes.json(),
 sectionsRes.json(),
 servicesRes.json(),
 seoRes.json(),
 ]);

 if (!platformRes.ok || !sectionsRes.ok || !servicesRes.ok || !seoRes.ok) {
 throw new Error('platform_load_failed');
 }

 setPayload(platformJson);
 setSections(Array.isArray(sectionsJson.items) ? sectionsJson.items : []);
 setServices(Array.isArray(servicesJson.items) ? servicesJson.items : []);
 setSeoOverrides(Array.isArray(seoJson.items) ? seoJson.items : []);
 setStatus('ready');
 } catch {
 setStatus('error');
 }
 }

 useEffect(() => {
 void loadAll();
 }, []);

 const counts = payload?.counts || {};
 const serviceGroups = useMemo(() => {
 return Array.from(new Set(services.map((item) => item.service_group).filter(Boolean))).sort();
 }, [services]);

 const saveSection = async () => {
 if (!sectionDraft.section_key.trim() || !sectionDraft.title.trim()) {
 setMessage('Homepage section için section_key ve title zorunlu.');
 return;
 }

 const res = await fetch('/api/admin/site/homepage-sections', {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 ...sectionDraft,
 section_key: sectionDraft.section_key.trim(),
 title: sectionDraft.title.trim(),
 }),
 });
 const json = await res.json();
 if (!res.ok || !json?.success) {
 setMessage(json?.detail || json?.error || 'Homepage section kaydedilemedi.');
 return;
 }

 setMessage(`Homepage section kaydedildi: ${sectionDraft.section_key}`);
 setSectionDraft(EMPTY_SECTION);
 await loadAll();
 };

 const saveService = async () => {
 if (
 !serviceDraft.service_key.trim() ||
 !serviceDraft.service_group.trim() ||
 !serviceDraft.title.trim() ||
 !serviceDraft.slug.trim() ||
 !serviceDraft.href.trim()
 ) {
 setMessage('Servis kaydı için zorunlu alanları doldurun.');
 return;
 }

 const res = await fetch('/api/admin/site/services', {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 ...serviceDraft,
 service_key: serviceDraft.service_key.trim(),
 service_group: serviceDraft.service_group.trim(),
 title: serviceDraft.title.trim(),
 slug: serviceDraft.slug.trim(),
 href: serviceDraft.href.trim(),
 }),
 });
 const json = await res.json();
 if (!res.ok || !json?.success) {
 setMessage(json?.detail || json?.error || 'Servis kaydedilemedi.');
 return;
 }

 setMessage(`Servis kaydedildi: ${serviceDraft.service_key}`);
 setServiceDraft(EMPTY_SERVICE);
 await loadAll();
 };

 const saveSeo = async () => {
 if (
 !seoDraft.entity_type.trim() ||
 !seoDraft.entity_key.trim() ||
 !seoDraft.canonical_path.trim()
 ) {
 setMessage('SEO override için entity_type, entity_key ve canonical_path zorunlu.');
 return;
 }

 const res = await fetch('/api/admin/site/seo-overrides', {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 ...seoDraft,
 entity_type: seoDraft.entity_type.trim(),
 entity_key: seoDraft.entity_key.trim(),
 canonical_path: seoDraft.canonical_path.trim(),
 }),
 });
 const json = await res.json();
 if (!res.ok || !json?.success) {
 setMessage(json?.detail || json?.error || 'SEO override kaydedilemedi.');
 return;
 }

 setMessage(`SEO override kaydedildi: ${seoDraft.entity_type}:${seoDraft.entity_key}`);
 setSeoDraft(EMPTY_SEO);
 await loadAll();
 };

 const deleteSection = async (sectionKey: string) => {
 const res = await fetch('/api/admin/site/homepage-sections', {
 method: 'DELETE',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ sectionKey }),
 });
 const json = await res.json();
 if (!res.ok || !json?.success) {
 setMessage(json?.detail || json?.error || 'Homepage section silinemedi.');
 return;
 }
 setMessage(`Homepage section silindi: ${sectionKey}`);
 await loadAll();
 };

 const deleteService = async (serviceKey: string) => {
 const res = await fetch('/api/admin/site/services', {
 method: 'DELETE',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ serviceKey }),
 });
 const json = await res.json();
 if (!res.ok || !json?.success) {
 setMessage(json?.detail || json?.error || 'Servis silinemedi.');
 return;
 }
 setMessage(`Servis silindi: ${serviceKey}`);
 await loadAll();
 };

 const deleteSeo = async (entityType: string, entityKey: string) => {
 const res = await fetch('/api/admin/site/seo-overrides', {
 method: 'DELETE',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ entityType, entityKey }),
 });
 const json = await res.json();
 if (!res.ok || !json?.success) {
 setMessage(json?.detail || json?.error || 'SEO override silinemedi.');
 return;
 }
 setMessage(`SEO override silindi: ${entityType}:${entityKey}`);
 await loadAll();
 };

 if (status === 'loading') {
 return (
 <section className="mb-6 rounded-sm border border-[rgba(184,115,51,0.14)] bg-[var(--bg-card)] p-5 shadow-sm">
 <p className="text-sm text-[#7A6B58]">DB-first platform yönetimi yükleniyor...</p>
 </section>
 );
 }

 if (status === 'error') {
 return (
 <section className="mb-6 rounded-sm border border-[rgba(234,179,8,0.25)] bg-[rgba(234,179,8,0.08)] p-5 shadow-sm">
 <h2 className="text-lg font-bold text-amber-400">DB-first platform yönetimi alınamadı</h2>
 <p className="mt-1 text-sm text-amber-400">
 Admin API veya tablo yapısı hazır değil. Önce platform migration ve route zinciri doğrulanmalı.
 </p>
 </section>
 );
 }

 return (
 <section className="mb-6 rounded-sm border border-[rgba(184,115,51,0.14)] bg-[var(--bg-card)] p-6 shadow-sm">
 <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
 <div>
 <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#4A3828]">
 DB-First Platform
 </p>
 <h2 className="mt-2 text-2xl font-bold text-[#1F1410]">
 Homepage, şehir servisleri ve SEO override yönetimi
 </h2>
 <p className="mt-1 max-w-3xl text-sm text-[#7A6B58]">
 Ana sayfa section registry, şehir servis kayıtları ve entity bazlı SEO override
 verileri bu panelden yönetilir. Public Astro sayfaları artık bu verileri doğrudan tüketir.
 </p>
 </div>
 <button
 onClick={() => void loadAll()}
 className="rounded-full border border-[rgba(184,115,51,0.14)] bg-[rgba(184,115,51,0.04)] px-4 py-2 text-sm font-semibold text-[#7A6B58]"
 >
 Yenile
 </button>
 </div>

 <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
 <MetricCard
 label="Homepage Sections"
 value={`${counts.homepageSections?.active || 0}/${counts.homepageSections?.total || 0}`}
 hint="aktif / toplam"
 />
 <MetricCard
 label="City Services"
 value={`${counts.serviceEntries?.active || 0}/${counts.serviceEntries?.total || 0}`}
 hint="aktif / toplam"
 />
 <MetricCard
 label="SEO Overrides"
 value={`${counts.seoOverrides?.active || 0}/${counts.seoOverrides?.total || 0}`}
 hint="aktif / toplam"
 />
 <MetricCard
 label="Media Assets"
 value={`${counts.mediaAssets || 0}`}
 hint="DB medya varlığı"
 />
 <MetricCard
 label="Media Usage"
 value={`${counts.mediaUsage || 0}`}
 hint="asset ilişki kaydı"
 />
 </div>

 <div className="mt-6 grid gap-6 xl:grid-cols-3">
 <div className="rounded-sm border border-[rgba(184,115,51,0.14)] bg-[rgba(184,115,51,0.04)] p-5">
 <h3 className="text-lg font-bold text-[#1F1410]">Homepage Section Formu</h3>
 <FormText
 label="Section Key"
 value={sectionDraft.section_key}
 onChange={(value) => setSectionDraft((prev) => ({ ...prev, section_key: value }))}
 />
 <FormText
 label="Başlık"
 value={sectionDraft.title}
 onChange={(value) => setSectionDraft((prev) => ({ ...prev, title: value }))}
 />
 <FormText
 label="Açıklama"
 value={sectionDraft.description || ''}
 onChange={(value) => setSectionDraft((prev) => ({ ...prev, description: value }))}
 />
 <FormText
 label="Sort Order"
 value={String(sectionDraft.sort_order)}
 onChange={(value) =>
 setSectionDraft((prev) => ({ ...prev, sort_order: Number(value || 0) }))
 }
 />
 <ToggleRow
 label="Aktif"
 checked={sectionDraft.is_active}
 onChange={(checked) => setSectionDraft((prev) => ({ ...prev, is_active: checked }))}
 />
 <JsonArea
 label="Config JSON"
 value={JSON.stringify(sectionDraft.config || {}, null, 2)}
 onChange={(value) => {
 try {
 setSectionDraft((prev) => ({ ...prev, config: JSON.parse(value) }));
 } catch {
 setMessage('Section config JSON geçersiz.');
 }
 }}
 />
 <button
 onClick={() => void saveSection()}
 className="mt-4 rounded-sm bg-[rgba(184,115,51,0.08)] px-4 py-2 text-sm font-semibold text-[#1F1410]"
 >
 Homepage Section Kaydet
 </button>
 <ListTable
 items={sections}
 renderItem={(item) => (
 <RowCard
 key={item.section_key}
 title={item.title}
 subtitle={`${item.section_key} | sıra ${item.sort_order} | ${
 item.is_active ? 'aktif' : 'pasif'
 }`}
 onEdit={() => setSectionDraft(item)}
 onDelete={() => void deleteSection(item.section_key)}
 />
 )}
 />
 </div>

 <div className="rounded-sm border border-[rgba(184,115,51,0.14)] bg-[rgba(184,115,51,0.04)] p-5">
 <h3 className="text-lg font-bold text-[#1F1410]">Şehir Servisi Formu</h3>
 <FormText
 label="Service Key"
 value={serviceDraft.service_key}
 onChange={(value) => setServiceDraft((prev) => ({ ...prev, service_key: value }))}
 />
 <FormText
 label="Service Group"
 value={serviceDraft.service_group}
 onChange={(value) => setServiceDraft((prev) => ({ ...prev, service_group: value }))}
 />
 <FormText
 label="Başlık"
 value={serviceDraft.title}
 onChange={(value) => setServiceDraft((prev) => ({ ...prev, title: value }))}
 />
 <FormText
 label="Slug"
 value={serviceDraft.slug}
 onChange={(value) => setServiceDraft((prev) => ({ ...prev, slug: value }))}
 />
 <FormText
 label="Href"
 value={serviceDraft.href}
 onChange={(value) => setServiceDraft((prev) => ({ ...prev, href: value }))}
 />
 <FormText
 label="Özet"
 value={serviceDraft.summary || ''}
 onChange={(value) => setServiceDraft((prev) => ({ ...prev, summary: value }))}
 />
 <FormText
 label="Badge"
 value={serviceDraft.badge || ''}
 onChange={(value) => setServiceDraft((prev) => ({ ...prev, badge: value }))}
 />
 <FormText
 label="Freshness Key"
 value={serviceDraft.freshness_key || ''}
 onChange={(value) =>
 setServiceDraft((prev) => ({ ...prev, freshness_key: value }))
 }
 />
 <FormText
 label="Sort Order"
 value={String(serviceDraft.sort_order)}
 onChange={(value) =>
 setServiceDraft((prev) => ({ ...prev, sort_order: Number(value || 0) }))
 }
 />
 <ToggleRow
 label="Aktif"
 checked={serviceDraft.is_active}
 onChange={(checked) => setServiceDraft((prev) => ({ ...prev, is_active: checked }))}
 />
 <JsonArea
 label="Payload JSON"
 value={JSON.stringify(serviceDraft.payload || {}, null, 2)}
 onChange={(value) => {
 try {
 setServiceDraft((prev) => ({ ...prev, payload: JSON.parse(value) }));
 } catch {
 setMessage('Service payload JSON geçersiz.');
 }
 }}
 />
 <button
 onClick={() => void saveService()}
 className="mt-4 rounded-sm bg-[rgba(184,115,51,0.08)] px-4 py-2 text-sm font-semibold text-[#1F1410]"
 >
 Servis Kaydet
 </button>
 <div className="mt-4 flex flex-wrap gap-2">
 {serviceGroups.map((group) => (
 <span
 key={group}
 className="rounded-full border border-[rgba(184,115,51,0.14)] bg-[var(--bg-card)] px-3 py-1 text-xs font-semibold text-[#7A6B58]"
 >
 {group}
 </span>
 ))}
 </div>
 <ListTable
 items={services}
 renderItem={(item) => (
 <RowCard
 key={item.service_key}
 title={item.title}
 subtitle={`${item.service_key} | ${item.href} | ${
 item.is_active ? 'aktif' : 'pasif'
 }`}
 onEdit={() => setServiceDraft(item)}
 onDelete={() => void deleteService(item.service_key)}
 />
 )}
 />
 </div>

 <div className="rounded-sm border border-[rgba(184,115,51,0.14)] bg-[rgba(184,115,51,0.04)] p-5">
 <h3 className="text-lg font-bold text-[#1F1410]">SEO Override Formu</h3>
 <FormText
 label="Entity Type"
 value={seoDraft.entity_type}
 onChange={(value) => setSeoDraft((prev) => ({ ...prev, entity_type: value }))}
 />
 <FormText
 label="Entity Key"
 value={seoDraft.entity_key}
 onChange={(value) => setSeoDraft((prev) => ({ ...prev, entity_key: value }))}
 />
 <FormText
 label="Canonical Path"
 value={seoDraft.canonical_path}
 onChange={(value) =>
 setSeoDraft((prev) => ({ ...prev, canonical_path: value }))
 }
 />
 <ToggleRow
 label="Aktif"
 checked={seoDraft.is_active}
 onChange={(checked) => setSeoDraft((prev) => ({ ...prev, is_active: checked }))}
 />
 <JsonArea
 label="SEO Payload JSON"
 value={JSON.stringify(seoDraft.seo_payload || {}, null, 2)}
 onChange={(value) => {
 try {
 setSeoDraft((prev) => ({ ...prev, seo_payload: JSON.parse(value) }));
 } catch {
 setMessage('SEO payload JSON geçersiz.');
 }
 }}
 />
 <button
 onClick={() => void saveSeo()}
 className="mt-4 rounded-sm bg-[rgba(184,115,51,0.08)] px-4 py-2 text-sm font-semibold text-[#1F1410]"
 >
 SEO Override Kaydet
 </button>
 <ListTable
 items={seoOverrides}
 renderItem={(item) => (
 <RowCard
 key={`${item.entity_type}-${item.entity_key}`}
 title={`${item.entity_type}:${item.entity_key}`}
 subtitle={`${item.canonical_path} | ${item.is_active ? 'aktif' : 'pasif'}`}
 onEdit={() => setSeoDraft(item)}
 onDelete={() => void deleteSeo(item.entity_type, item.entity_key)}
 />
 )}
 />
 </div>
 </div>

 {message ? <p className="mt-4 text-sm font-medium text-[#7A6B58]">{message}</p> : null}
 </section>
 );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
 return (
 <div className="rounded-sm border border-[rgba(184,115,51,0.14)] bg-[rgba(184,115,51,0.04)] p-4">
 <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4A3828]">{label}</p>
 <p className="mt-2 text-2xl font-bold text-[#1F1410]">{value}</p>
 <p className="mt-1 text-sm text-[#7A6B58]">{hint}</p>
 </div>
 );
}

function FormText({
 label,
 value,
 onChange,
}: {
 label: string;
 value: string;
 onChange: (value: string) => void;
}) {
 return (
 <label className="mt-3 block">
 <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[#4A3828]">
 {label}
 </span>
 <input
 className="w-full rounded-sm border border-slate-300 bg-[var(--bg-card)] px-3 py-2 text-sm text-[#1F1410]"
 value={value}
 onChange={(e) => onChange(e.target.value)}
 />
 </label>
 );
}

function JsonArea({
 label,
 value,
 onChange,
}: {
 label: string;
 value: string;
 onChange: (value: string) => void;
}) {
 return (
 <label className="mt-3 block">
 <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[#4A3828]">
 {label}
 </span>
 <textarea
 className="min-h-[120px] w-full rounded-sm border border-slate-300 bg-[var(--bg-card)] px-3 py-2 font-mono text-xs text-[#1F1410]"
 value={value}
 onChange={(e) => onChange(e.target.value)}
 />
 </label>
 );
}

function ToggleRow({
 label,
 checked,
 onChange,
}: {
 label: string;
 checked: boolean;
 onChange: (checked: boolean) => void;
}) {
 return (
 <label className="mt-3 flex items-center gap-2 text-sm text-[#7A6B58]">
 <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
 <span>{label}</span>
 </label>
 );
}

function ListTable<T>({
 items,
 renderItem,
}: {
 items: T[];
 renderItem: (item: T) => ReactNode;
}) {
 return <div className="mt-5 space-y-3">{items.map(renderItem)}</div>;
}

function RowCard({
 title,
 subtitle,
 onEdit,
 onDelete,
}: {
 title: string;
 subtitle: string;
 onEdit: () => void;
 onDelete: () => void;
}) {
 return (
 <div className="rounded-sm border border-[rgba(184,115,51,0.14)] bg-[var(--bg-card)] p-3">
 <p className="font-semibold text-[#1F1410]">{title}</p>
 <p className="mt-1 text-xs text-[#4A3828]">{subtitle}</p>
 <div className="mt-3 flex gap-2">
 <button
 onClick={onEdit}
 className="rounded-sm bg-[rgba(184,115,51,0.08)] px-3 py-1.5 text-xs font-semibold text-[#1F1410]"
 >
 Düzenle
 </button>
 <button
 onClick={onDelete}
 className="rounded-sm bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
 >
 Sil
 </button>
 </div>
 </div>
 );
}
