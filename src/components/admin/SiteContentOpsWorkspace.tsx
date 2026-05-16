import type { ChangeEvent, Dispatch, SetStateAction } from 'react';

type SiteContentOpsTab = 'media' | 'schema' | 'versions' | 'audit';

type HeroConfig = {
 badge: string;
 title: string;
 description: string;
 searchPlaceholder: string;
 backgroundImage: string;
};

type MediaAssetRow = {
 asset_key: string;
 url: string;
 alt?: string | null;
 metadata?: Record<string, any> | null;
};

type MediaDraftRow = {
 url: string;
 alt: string;
 bucket: string;
 provider: string;
 mimeType: string;
 width: string;
 height: string;
};

type SiteSchemaField = {
 key: string;
 type: 'string' | 'array' | 'object';
 required: boolean;
 note?: string;
};

type SettingHistoryItem = {
 version_no: number;
 note?: string | null;
 changed_by?: string | null;
 created_at?: string;
};

type SettingDiffResult = {
 summary: { added: number; removed: number; changed: number };
 diff: {
  added: Array<{ path: string; next: string }>;
  removed: Array<{ path: string; prev: string }>;
  changed: Array<{ path: string; prev: string; next: string }>;
 };
};

type RollbackPreview = {
 summary?: { changed: number };
 changed?: Array<{ path: string; current: string | null; rollbackTo: string | null }>;
};

type AuditItem = {
 id: string;
 setting_key: string;
 action: string;
 actor_email?: string | null;
 ip_address?: string | null;
 metadata?: Record<string, any> | null;
 created_at?: string;
};

type ImageSearchResult = {
 provider: string;
 id: string;
 url: string;
 thumb?: string;
 author?: string;
};

type Props = {
 opsTab: SiteContentOpsTab;
 setOpsTab: Dispatch<SetStateAction<SiteContentOpsTab>>;
 imageQuery: string;
 setImageQuery: Dispatch<SetStateAction<string>>;
 assetKey: string;
 setAssetKey: Dispatch<SetStateAction<string>>;
 searchImages: () => Promise<void>;
 imageResults: ImageSearchResult[];
 importImage: (url: string) => Promise<void>;
 mediaBucketFilter: string;
 setMediaBucketFilter: Dispatch<SetStateAction<string>>;
 loadMediaLibrary: () => Promise<void>;
 mediaLoading: boolean;
 mediaItems: MediaAssetRow[];
 mediaDrafts: Record<string, MediaDraftRow>;
 updateMediaDraftField: (
  assetKey: string,
  field: keyof MediaDraftRow,
 ) => (event: ChangeEvent<HTMLInputElement>) => void;
 applyMediaToHero: (url: string) => void;
 saveMediaAsset: (assetKey: string) => Promise<void>;
 deleteMediaAsset: (assetKey: string) => Promise<void>;
 schemaMap: Record<string, SiteSchemaField[]>;
 schemaKey: string;
 setSchemaKey: Dispatch<SetStateAction<string>>;
 hero: HeroConfig;
 setHero: Dispatch<SetStateAction<HeroConfig>>;
 saveSetting: (
  key: string,
  value: Record<string, any>,
  note: string,
  mode?: 'draft' | 'publish',
 ) => Promise<void>;
 rollbackKey: string;
 setRollbackKey: Dispatch<SetStateAction<string>>;
 rollbackVersion: string;
 setRollbackVersion: Dispatch<SetStateAction<string>>;
 previewRollback: () => Promise<void>;
 rollbackSetting: () => Promise<void>;
 rollbackPreviewLoading: boolean;
 rollbackPreview: RollbackPreview | null;
 historyKey: string;
 setHistoryKey: Dispatch<SetStateAction<string>>;
 loadSettingHistory: () => Promise<void>;
 historyLoading: boolean;
 historyItems: SettingHistoryItem[];
 diffKey: string;
 setDiffKey: Dispatch<SetStateAction<string>>;
 diffFromVersion: string;
 setDiffFromVersion: Dispatch<SetStateAction<string>>;
 diffToVersion: string;
 setDiffToVersion: Dispatch<SetStateAction<string>>;
 loadSettingDiff: () => Promise<void>;
 diffLoading: boolean;
 diffResult: SettingDiffResult | null;
 auditKeyFilter: string;
 setAuditKeyFilter: Dispatch<SetStateAction<string>>;
 auditActionFilter: string;
 setAuditActionFilter: Dispatch<SetStateAction<string>>;
 loadAuditTimeline: () => Promise<void>;
 auditLoading: boolean;
 auditItems: AuditItem[];
};

const OPS_TABS: Array<{ key: SiteContentOpsTab; label: string; description: string }> = [
 {
  key: 'media',
  label: 'Medya ve Görseller',
  description: 'Görsel arama, import ve medya kütüphanesi işlemleri.',
 },
 {
  key: 'schema',
  label: 'Schema Rehberi',
  description: 'Alan tipleri ve otomatik form eşleşmeleri.',
 },
 {
  key: 'versions',
  label: 'Sürüm ve Karşılaştırma',
  description: 'Rollback, geçmiş ve diff araçları.',
 },
 {
  key: 'audit',
  label: 'Denetim Zaman Akışı',
  description: 'Değişiklik kaydı ve CSV dışa aktarma.',
 },
];

export default function SiteContentOpsWorkspace(props: Props) {
 const activeTab = OPS_TABS.find((tab) => tab.key === props.opsTab);

 return (
  <>
   <div className="rounded-sm border border-[var(--adm-border)] bg-[var(--adm-bg-elev)] p-5">
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
     <div>
      <h2 className="text-xl font-bold text-[var(--adm-text)]">Operasyon Araçları</h2>
      <p className="mt-1 text-sm text-[var(--adm-text-muted)]">
       Ağır yönetim araçlarını ihtiyaç olduğunda aç. İlk yükte yalnızca seçili sekme mount edilir.
      </p>
     </div>
     <div className="flex flex-wrap gap-2">
      {OPS_TABS.map((tab) => (
       <button
        key={tab.key}
        type="button"
        onClick={() => props.setOpsTab(tab.key)}
        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
         props.opsTab === tab.key
          ? 'border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.1)] text-red-400'
          : 'border-[var(--adm-border)] bg-[var(--adm-bg-hover)] text-[var(--adm-text-muted)] hover:border-[var(--adm-border-strong)] hover:bg-[var(--adm-bg-elev)]'
        }`}
       >
        {tab.label}
       </button>
      ))}
     </div>
    </div>
    <p className="mt-3 text-xs text-[var(--adm-text-muted)]">{activeTab?.description}</p>
   </div>

   {props.opsTab === 'media' && (
    <>
     <div className="rounded-sm border border-[var(--adm-border)] bg-[var(--adm-bg-elev)] p-5">
      <h2 className="text-xl font-bold text-[var(--adm-text)]">
       Görsel API Arama ve İçe Aktarma (Unsplash + Pexels)
      </h2>
      <p className="mt-1 text-sm text-[var(--adm-text-muted)]">
       Arama yap, uygun görseli seç ve `site_media_assets` tablosuna kaydet.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
       <input
        className="rounded-sm border border-[var(--adm-border-strong)] px-3 py-2 bg-[var(--adm-bg-elev)] text-[var(--adm-text)]"
        placeholder="Arama (örn: Göbeklitepe gün batımı)"
        value={props.imageQuery}
        onChange={(e) => props.setImageQuery(e.target.value)}
       />
       <input
        className="rounded-sm border border-[var(--adm-border-strong)] px-3 py-2 bg-[var(--adm-bg-elev)] text-[var(--adm-text)]"
        placeholder="Görsel anahtarı (örn: homepage.hero.background)"
        value={props.assetKey}
        onChange={(e) => props.setAssetKey(e.target.value)}
       />
       <button
        onClick={() => void props.searchImages()}
        className="rounded-sm bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
       >
        Görsel Ara
       </button>
      </div>
      {props.imageResults.length > 0 && (
       <div className="mt-4 grid gap-4 md:grid-cols-2">
        {props.imageResults.map((img, idx) => (
         <div
          key={`${img.provider}-${img.id}-${idx}`}
          className="rounded-sm border border-[var(--adm-border)] p-3"
         >
          <img
           src={img.thumb || img.url}
           alt={img.author || 'görsel'}
           className="h-40 w-full rounded object-cover"
          />
          <p className="mt-2 text-xs text-[var(--adm-text-muted)]">
           {img.provider} / {img.author || 'Bilinmeyen'}
          </p>
          <button
           onClick={() => void props.importImage(img.url)}
           className="mt-2 rounded bg-urfa-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-urfa-700"
          >
           Bu Görseli Kaydet
          </button>
         </div>
        ))}
       </div>
      )}
     </div>

     <div className="rounded-sm border border-[var(--adm-border)] bg-[var(--adm-bg-elev)] p-5">
      <h2 className="text-xl font-bold text-[var(--adm-text)]">Medya Kütüphanesi (DB)</h2>
      <p className="mt-1 text-sm text-[var(--adm-text-muted)]">
       Kaydedilen görselleri filtrele, hero alanına uygula veya gereksiz kayıtları temizle.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
       <input
        className="rounded-sm border border-[var(--adm-border-strong)] px-3 py-2 bg-[var(--adm-bg-elev)] text-[var(--adm-text)]"
        placeholder="Klasör filtresi (örn: places, blog)"
        value={props.mediaBucketFilter}
        onChange={(e) => props.setMediaBucketFilter(e.target.value)}
       />
       <button
        onClick={() => void props.loadMediaLibrary()}
        className="rounded-sm bg-[var(--adm-border)] px-4 py-2 text-sm font-semibold text-[var(--adm-text)] hover:bg-[rgba(184,115,51,0.22)]"
       >
        {props.mediaLoading ? 'Yükleniyor…' : 'Kütüphaneyi Yenile'}
       </button>
      </div>

      {props.mediaItems.length > 0 && (
       <div className="mt-4 grid gap-4 md:grid-cols-2">
        {props.mediaItems.map((item) => (
         <div key={item.asset_key} className="rounded-sm border border-[var(--adm-border)] p-3">
          <img
           src={item.url}
           alt={item.alt || item.asset_key}
           className="h-40 w-full rounded object-cover"
          />
          <p className="mt-2 text-xs text-[var(--adm-text-muted)] break-all">{item.asset_key}</p>
          <p className="mt-1 text-xs text-[var(--adm-text-muted)]">
           {item.metadata?.provider || 'yerel'} / {item.metadata?.bucket || '-'}
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
           <input
            className="rounded-sm border border-[var(--adm-border-strong)] px-2 py-1 text-xs bg-[var(--adm-bg-elev)] text-[var(--adm-text)]"
            value={props.mediaDrafts[item.asset_key]?.alt || ''}
            onChange={props.updateMediaDraftField(item.asset_key, 'alt')}
            placeholder="alt metni"
           />
           <input
            className="rounded-sm border border-[var(--adm-border-strong)] px-2 py-1 text-xs bg-[var(--adm-bg-elev)] text-[var(--adm-text)]"
            value={props.mediaDrafts[item.asset_key]?.bucket || ''}
            onChange={props.updateMediaDraftField(item.asset_key, 'bucket')}
            placeholder="klasör"
           />
           <input
            className="rounded-sm border border-[var(--adm-border-strong)] px-2 py-1 text-xs bg-[var(--adm-bg-elev)] text-[var(--adm-text)]"
            value={props.mediaDrafts[item.asset_key]?.provider || ''}
            onChange={props.updateMediaDraftField(item.asset_key, 'provider')}
            placeholder="sağlayıcı"
           />
           <input
            className="rounded-sm border border-[var(--adm-border-strong)] px-2 py-1 text-xs bg-[var(--adm-bg-elev)] text-[var(--adm-text)]"
            value={props.mediaDrafts[item.asset_key]?.mimeType || ''}
            onChange={props.updateMediaDraftField(item.asset_key, 'mimeType')}
            placeholder="MIME tipi"
           />
          </div>
          <input
           className="mt-2 w-full rounded-sm border border-[var(--adm-border-strong)] px-2 py-1 text-xs bg-[var(--adm-bg-elev)] text-[var(--adm-text)]"
           value={props.mediaDrafts[item.asset_key]?.url || item.url}
           onChange={props.updateMediaDraftField(item.asset_key, 'url')}
           placeholder="görsel URL"
          />
          <div className="mt-2 flex gap-2">
           <button
            onClick={() => props.applyMediaToHero(item.url)}
            className="rounded bg-urfa-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-urfa-700"
           >
            Hero&apos;ya Uygula
           </button>
           <button
            onClick={() => void props.saveMediaAsset(item.asset_key)}
            className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
           >
            Güncelle
           </button>
           <button
            onClick={() => void props.deleteMediaAsset(item.asset_key)}
            className="rounded bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
           >
            Sil
           </button>
          </div>
         </div>
        ))}
       </div>
      )}
     </div>
    </>
   )}

   {props.opsTab === 'schema' && (
    <div className="rounded-sm border border-[var(--adm-border)] bg-[var(--adm-bg-elev)] p-5">
     <h2 className="text-xl font-bold text-[var(--adm-text)]">Schema Tabanlı Alan Rehberi</h2>
     <p className="mt-1 text-sm text-[var(--adm-text-muted)]">
      Admin form alanlarının zorunlu şema yapısı. JSON editörden önce alan tiplerini doğrular.
     </p>
     <div className="mt-4 flex gap-3">
      <select
       className="rounded-sm border border-[var(--adm-border-strong)] px-3 py-2 text-sm bg-[var(--adm-bg-elev)] text-[var(--adm-text)]"
       value={props.schemaKey}
       onChange={(e) => props.setSchemaKey(e.target.value)}
      >
       {Object.keys(props.schemaMap).map((key) => (
        <option key={key} value={key}>
         {key}
        </option>
       ))}
      </select>
     </div>
     <div className="mt-3 grid gap-2 md:grid-cols-2">
      {(props.schemaMap[props.schemaKey] || []).map((field) => (
       <div
        key={`${props.schemaKey}-${field.key}`}
        className="rounded border border-[var(--adm-border)] bg-[var(--adm-bg-hover)] p-2 text-xs"
       >
        <p className="font-mono text-[var(--adm-text)]">{field.key}</p>
        <p className="text-[var(--adm-text-muted)]">
         tip: {field.type} | zorunlu: {field.required ? 'evet' : 'hayır'}
        </p>
        {field.note && <p className="text-[var(--adm-text-muted)]">{field.note}</p>}
       </div>
      ))}
     </div>
     {props.schemaKey === 'homepage.hero' && (
      <div className="mt-4 rounded-sm border border-[rgba(99,102,241,0.2)] bg-[rgba(99,102,241,0.08)] p-3">
       <p className="text-sm font-semibold text-[var(--adm-text)]">Otomatik Form (homepage.hero)</p>
       <div className="mt-2 grid gap-2 md:grid-cols-2">
        {(props.schemaMap['homepage.hero'] || [])
         .filter((f) => f.type === 'string')
         .map((f) => (
          <label key={`auto-hero-${f.key}`} className="text-xs text-[var(--adm-text)]">
           <span className="mb-1 block font-mono">{f.key}</span>
           <input
            className="w-full rounded border border-[rgba(99,102,241,0.3)] px-2 py-1"
            value={String((props.hero as any)[f.key] || '')}
            onChange={(e) =>
             props.setHero((prev) => ({ ...prev, [f.key]: e.target.value }) as HeroConfig)
            }
           />
          </label>
         ))}
       </div>
       <div className="mt-2">
        <button
         onClick={() =>
          void props.saveSetting('homepage.hero', props.hero as any, 'Otomatik form kaydı', 'publish')
         }
         className="rounded bg-urfa-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-urfa-700"
        >
         Otomatik Form ile Yayına Al
        </button>
       </div>
      </div>
     )}
    </div>
   )}

   {props.opsTab === 'versions' && (
    <>
     <div className="rounded-sm border border-[var(--adm-border)] bg-[var(--adm-bg-elev)] p-5">
      <h2 className="text-xl font-bold text-[var(--adm-text)]">Sürüm Geri Alma</h2>
      <p className="mt-1 text-sm text-[var(--adm-text-muted)]">Yayınlanmış bir ayarı eski sürüme geri döndür.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
       <input
        className="rounded-sm border border-[var(--adm-border-strong)] px-3 py-2 bg-[var(--adm-bg-elev)] text-[var(--adm-text)]"
        value={props.rollbackKey}
        onChange={(e) => props.setRollbackKey(e.target.value)}
        placeholder="ayar anahtarı"
       />
       <input
        className="rounded-sm border border-[var(--adm-border-strong)] px-3 py-2 bg-[var(--adm-bg-elev)] text-[var(--adm-text)]"
        value={props.rollbackVersion}
        onChange={(e) => props.setRollbackVersion(e.target.value)}
        placeholder="sürüm no"
       />
       <div className="flex gap-2">
        <button
         onClick={() => void props.previewRollback()}
         className="rounded-sm bg-urfa-600 px-4 py-2 text-sm font-semibold text-white hover:bg-urfa-700"
        >
         {props.rollbackPreviewLoading ? 'Önizleme...' : 'Deneme Önizle'}
        </button>
        <button
         onClick={() => void props.rollbackSetting()}
         className="rounded-sm bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
        >
         Geri Alma Uygula
        </button>
       </div>
      </div>
      {props.rollbackPreview && (
       <div className="mt-3 rounded-sm border border-[rgba(234,179,8,0.25)] bg-[rgba(234,179,8,0.08)] p-3 text-xs text-amber-400">
        <p className="font-semibold">
         Deneme sonucu: {props.rollbackPreview.summary?.changed || 0} alan değişecek
        </p>
        <div className="mt-2 space-y-1">
         {(props.rollbackPreview.changed || []).slice(0, 20).map((item) => (
          <p key={item.path} className="font-mono">
           {item.path}
          </p>
         ))}
        </div>
       </div>
      )}
     </div>

     <div className="rounded-sm border border-[var(--adm-border)] bg-[var(--adm-bg-elev)] p-5">
      <h2 className="text-xl font-bold text-[var(--adm-text)]">Ayar Sürüm Geçmişi</h2>
      <p className="mt-1 text-sm text-[var(--adm-text-muted)]">
       Belirli bir `setting_key` için son sürümleri listele.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
       <input
        className="rounded-sm border border-[var(--adm-border-strong)] px-3 py-2 bg-[var(--adm-bg-elev)] text-[var(--adm-text)]"
        value={props.historyKey}
        onChange={(e) => props.setHistoryKey(e.target.value)}
        placeholder="ayar anahtarı (örn: homepage.hero)"
       />
       <button
        onClick={() => void props.loadSettingHistory()}
        className="rounded-sm bg-urfa-600 px-4 py-2 text-sm font-semibold text-white hover:bg-urfa-700"
       >
        {props.historyLoading ? 'Yükleniyor…' : 'Geçmişi Getir'}
       </button>
      </div>

      {props.historyItems.length > 0 && (
       <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
         <thead>
          <tr className="border-b border-[var(--adm-border)] text-left text-[var(--adm-text-muted)]">
           <th className="px-2 py-2">Sürüm</th>
           <th className="px-2 py-2">Not</th>
           <th className="px-2 py-2">Değiştiren</th>
           <th className="px-2 py-2">Tarih</th>
          </tr>
         </thead>
         <tbody>
          {props.historyItems.map((item) => (
           <tr
            key={`${item.version_no}-${item.created_at || ''}`}
            className="border-b border-[var(--adm-bg-active)]"
           >
            <td className="px-2 py-2 font-medium text-[var(--adm-text)]">v{item.version_no}</td>
            <td className="px-2 py-2 text-[var(--adm-text-muted)]">{item.note || '-'}</td>
            <td className="px-2 py-2 text-[var(--adm-text-muted)]">{item.changed_by || '-'}</td>
            <td className="px-2 py-2 text-[var(--adm-text-muted)]">
             {item.created_at ? new Date(item.created_at).toLocaleString('tr-TR') : '-'}
            </td>
           </tr>
          ))}
         </tbody>
        </table>
       </div>
      )}
     </div>

     <div className="rounded-sm border border-[var(--adm-border)] bg-[var(--adm-bg-elev)] p-5">
      <h2 className="text-xl font-bold text-[var(--adm-text)]">Ayar Sürüm Karşılaştırma</h2>
      <p className="mt-1 text-sm text-[var(--adm-text-muted)]">
       İki sürüm arasındaki alan bazlı farkları gösterir.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
       <input
        className="rounded-sm border border-[var(--adm-border-strong)] px-3 py-2 bg-[var(--adm-bg-elev)] text-[var(--adm-text)]"
        value={props.diffKey}
        onChange={(e) => props.setDiffKey(e.target.value)}
        placeholder="ayar anahtarı"
       />
       <input
        className="rounded-sm border border-[var(--adm-border-strong)] px-3 py-2 bg-[var(--adm-bg-elev)] text-[var(--adm-text)]"
        value={props.diffFromVersion}
        onChange={(e) => props.setDiffFromVersion(e.target.value)}
        placeholder="önceki sürüm"
       />
       <input
        className="rounded-sm border border-[var(--adm-border-strong)] px-3 py-2 bg-[var(--adm-bg-elev)] text-[var(--adm-text)]"
        value={props.diffToVersion}
        onChange={(e) => props.setDiffToVersion(e.target.value)}
        placeholder="sonraki sürüm"
       />
       <button
        onClick={() => void props.loadSettingDiff()}
        className="rounded-sm bg-urfa-600 px-4 py-2 text-sm font-semibold text-white hover:bg-urfa-700"
       >
        {props.diffLoading ? 'Yükleniyor…' : 'Farkı Getir'}
       </button>
      </div>

      {props.diffResult && (
       <div className="mt-4 space-y-3 text-sm">
        <p className="text-[var(--adm-text-muted)]">
         Özet: +{props.diffResult.summary.added} / -{props.diffResult.summary.removed} / ~
         {props.diffResult.summary.changed}
        </p>

        {props.diffResult.diff.changed.length > 0 && (
         <div>
          <h3 className="font-semibold text-[var(--adm-text)]">Değişen Alanlar</h3>
          <div className="mt-2 space-y-2">
           {props.diffResult.diff.changed.slice(0, 50).map((item) => (
            <div
             key={`chg-${item.path}`}
             className="rounded border border-[var(--adm-border)] bg-[var(--adm-bg-hover)] p-2"
            >
             <p className="font-mono text-xs text-[var(--adm-text)]">{item.path}</p>
             <p className="text-xs text-rose-400">Eski: {item.prev}</p>
             <p className="text-xs text-emerald-400">Yeni: {item.next}</p>
            </div>
           ))}
          </div>
         </div>
        )}

        {props.diffResult.diff.added.length > 0 && (
         <div>
          <h3 className="font-semibold text-[var(--adm-text)]">Eklenen Alanlar</h3>
          <ul className="mt-2 list-disc pl-5 text-xs text-emerald-400">
           {props.diffResult.diff.added.slice(0, 50).map((item) => (
            <li key={`add-${item.path}`} className="font-mono">
             {item.path}: {item.next}
            </li>
           ))}
          </ul>
         </div>
        )}

        {props.diffResult.diff.removed.length > 0 && (
         <div>
          <h3 className="font-semibold text-[var(--adm-text)]">Silinen Alanlar</h3>
          <ul className="mt-2 list-disc pl-5 text-xs text-amber-400">
           {props.diffResult.diff.removed.slice(0, 50).map((item) => (
            <li key={`rem-${item.path}`} className="font-mono">
             {item.path}: {item.prev}
            </li>
           ))}
          </ul>
         </div>
        )}
       </div>
      )}
     </div>
    </>
   )}

   {props.opsTab === 'audit' && (
    <div className="rounded-sm border border-[var(--adm-border)] bg-[var(--adm-bg-elev)] p-5">
     <h2 className="text-xl font-bold text-[var(--adm-text)]">Denetim Zaman Akışı</h2>
     <p className="mt-1 text-sm text-[var(--adm-text-muted)]">
      İçerik/görsel değişikliklerinin kim-ne-zaman kaydını filtreleyerek görüntüleyin.
     </p>
     <div className="mt-4 grid gap-3 md:grid-cols-4">
      <input
       className="rounded-sm border border-[var(--adm-border-strong)] px-3 py-2 bg-[var(--adm-bg-elev)] text-[var(--adm-text)]"
       placeholder="anahtar filtresi (örn: homepage.hero)"
       value={props.auditKeyFilter}
       onChange={(e) => props.setAuditKeyFilter(e.target.value)}
      />
      <input
       className="rounded-sm border border-[var(--adm-border-strong)] px-3 py-2 bg-[var(--adm-bg-elev)] text-[var(--adm-text)]"
       placeholder="işlem filtresi (draft_save/publish/rollback/media_import)"
       value={props.auditActionFilter}
       onChange={(e) => props.setAuditActionFilter(e.target.value)}
      />
      <button
       onClick={() => void props.loadAuditTimeline()}
       className="rounded-sm bg-[var(--adm-bg-active)] px-4 py-2 text-sm font-semibold text-[var(--adm-text)] hover:bg-[rgba(184,115,51,0.18)]"
      >
       {props.auditLoading ? 'Yükleniyor…' : 'Zaman Akışını Getir'}
      </button>
      <a
       href={`/api/admin/site/audit/export?${new URLSearchParams({
        ...(props.auditKeyFilter.trim() ? { key: props.auditKeyFilter.trim() } : {}),
        ...(props.auditActionFilter.trim() ? { action: props.auditActionFilter.trim() } : {}),
        limit: '2000',
       }).toString()}`}
       className="rounded-sm bg-emerald-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-700"
      >
       CSV Dışa Aktar
      </a>
     </div>

     {props.auditItems.length > 0 && (
      <div className="mt-4 overflow-x-auto">
       <table className="min-w-full text-sm">
        <thead>
         <tr className="border-b border-[var(--adm-border)] text-left text-[var(--adm-text-muted)]">
          <th className="px-2 py-2">Tarih</th>
          <th className="px-2 py-2">Anahtar</th>
          <th className="px-2 py-2">İşlem</th>
          <th className="px-2 py-2">E-posta</th>
          <th className="px-2 py-2">IP</th>
          <th className="px-2 py-2">Meta Veri</th>
         </tr>
        </thead>
        <tbody>
         {props.auditItems.map((item) => (
          <tr key={item.id} className="border-b border-[var(--adm-bg-active)]">
           <td className="px-2 py-2 text-xs text-[var(--adm-text-muted)]">
            {item.created_at ? new Date(item.created_at).toLocaleString('tr-TR') : '-'}
           </td>
           <td className="px-2 py-2 font-mono text-xs text-[var(--adm-text)]">
            {item.setting_key}
           </td>
           <td className="px-2 py-2 text-xs text-blue-300">{item.action}</td>
           <td className="px-2 py-2 text-xs text-[var(--adm-text-muted)]">{item.actor_email || '-'}</td>
           <td className="px-2 py-2 text-xs text-[var(--adm-text-muted)]">{item.ip_address || '-'}</td>
           <td className="px-2 py-2 text-xs text-[var(--adm-text-muted)] font-mono">
            {item.metadata ? JSON.stringify(item.metadata).slice(0, 140) : '-'}
           </td>
          </tr>
         ))}
        </tbody>
       </table>
      </div>
     )}
    </div>
   )}
  </>
 );
}
