import { useState, useEffect} from 'react';

interface Collection {
 id: string;
 user_id: string;
 name: string;
 description?: string;
 icon?: string;
 is_public: boolean;
 place_count: number;
 follower_count?: number;
 created_at: string;
 updated_at: string;
}

interface CollectionsManagerProps {
 userId: string;
}

export default function CollectionsManager({ userId }: CollectionsManagerProps) {
 const [collections, setCollections] = useState<Collection[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [isCreating, setIsCreating] = useState(false);
 const [newCollectionForm, setNewCollectionForm] = useState({
 name: '',
 description: '',
 icon: '📍',
 is_public: false
 });
 const [error, setError] = useState('');

 // Load collections on mount
 useEffect(() => {
 loadCollections();
 }, [userId]);

 const loadCollections = async () => {
 try {
 setIsLoading(true);
 const response = await fetch(`/api/collections?userId=${userId}`);
 const data = await response.json();

 if (data.success) {
 setCollections(data.data);
 }
 } catch (err) {
 console.error('Failed to load collections:', err);
 setError('Koleksiyonlar yüklenemedi');
 } finally {
 setIsLoading(false);
 }
 };

 const handleCreateCollection = async (e: React.SyntheticEvent<HTMLFormElement>) => {
 e.preventDefault();

 if (!newCollectionForm.name.trim()) {
 setError('Koleksiyon adı gereklidir');
 return;
 }

 try {
 setIsCreating(true);
 const response = await fetch('/api/collections', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 name: newCollectionForm.name,
 description: newCollectionForm.description || undefined,
 icon: newCollectionForm.icon,
 isPublic: newCollectionForm.is_public
 })
 });

 const data = await response.json();

 if (data.success) {
 setCollections([data.data, ...collections]);
 setNewCollectionForm({
 name: '',
 description: '',
 icon: '📍',
 is_public: false
 });
 setError('');
 } else {
 setError(data.error || 'Koleksiyon oluşturulamadı');
 }
 } catch (err) {
 setError('Koleksiyon oluşturulurken bir hata oluştu');
 console.error('Create error:', err);
 } finally {
 setIsCreating(false);
 }
 };

 const handleDeleteCollection = async (collectionId: string, name: string) => {
 if (!await (window as any).showConfirm?.(`"${name}" koleksiyonunu silmek istediğinize emin misiniz?`)) return;

 try {
 const response = await fetch(`/api/collections/${collectionId}`, {
 method: 'DELETE'
 });

 const data = await response.json();

 if (data.success) {
 setCollections(collections.filter(c => c.id !== collectionId));
 } else {
 setError(data.error || 'Koleksiyon silinemedi');
 }
 } catch (err) {
 setError('Koleksiyon silinirken bir hata oluştu');
 console.error('Delete error:', err);
 }
 };

 return (
 <div className="space-y-8">
 {/* Create New Collection Form */}
 <div className="bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-6">
 <h2 className="text-2xl font-bold mb-4">Yeni Koleksiyon Oluştur</h2>

 <form onSubmit={handleCreateCollection} className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium mb-2">Adı *</label>
 <input
 type="text"
 value={newCollectionForm.name}
 onChange={e => setNewCollectionForm({ ...newCollectionForm, name: e.target.value })}
 placeholder="Örn: Favori Restoranlar"
 className="w-full border border-[rgba(184,115,51,0.25)] rounded px-3 py-2 "
 />
 </div>

 <div>
 <label className="block text-sm font-medium mb-2">İkon</label>
 <input
 type="text"
 value={newCollectionForm.icon}
 onChange={e => setNewCollectionForm({ ...newCollectionForm, icon: e.target.value })}
 placeholder="📍"
 maxLength={2}
 className="w-full border border-[rgba(184,115,51,0.25)] rounded px-3 py-2 "
 />
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium mb-2">Açıklama</label>
 <textarea
 value={newCollectionForm.description}
 onChange={e => setNewCollectionForm({ ...newCollectionForm, description: e.target.value })}
 placeholder="Bu koleksiyon hakkında..."
 rows={3}
 className="w-full border border-[rgba(184,115,51,0.25)] rounded px-3 py-2 "
 />
 </div>

 <div>
 <label className="flex items-center gap-2">
 <input
 type="checkbox"
 checked={newCollectionForm.is_public}
 onChange={e => setNewCollectionForm({ ...newCollectionForm, is_public: e.target.checked })}
 className="w-4 h-4"
 />
 <span className="text-sm font-medium">Herkese açık yap</span>
 </label>
 <p className="text-xs text-[#7A6B58] mt-1">Açık koleksiyonlar diğer kullanıcılar tarafından görülüp takip edilebilir</p>
 </div>

 {error && <p className="text-red-500 text-sm">{error}</p>}

 <button
 type="submit"
 disabled={isCreating}
 className="w-full bg-urfa-600 text-white py-2 rounded-sm font-medium hover:bg-urfa-700 disabled:opacity-50"
 >
 {isCreating ? 'Oluşturuluyor...' : 'Koleksiyon Oluştur'}
 </button>
 </form>
 </div>

 {/* Collections List */}
 <div>
 <h2 className="text-2xl font-bold mb-4">Koleksiyonlarım</h2>

 {isLoading ? (
 <div className="text-center py-12">Koleksiyonlar yükleniyor...</div>
 ) : collections.length === 0 ? (
 <div className="text-center py-12 text-[#7A6B58]">Henüz bir koleksiyon oluşturmadınız</div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {collections.map(collection => (
 <div key={collection.id} className="bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-4 hover:shadow-lg transition">
 {/* Header */}
 <div className="flex items-start justify-between mb-3">
 <div className="flex items-center gap-2">
 <span className="text-3xl">{collection.icon}</span>
 <div>
 <h3 className="font-bold text-lg">{collection.name}</h3>
 {collection.is_public && (
 <span className="text-xs bg-[rgba(34,197,94,0.12)] text-green-400 px-2 py-1 rounded">🌍 Açık</span>
 )}
 </div>
 </div>
 </div>

 {/* Description */}
 {collection.description && (
 <p className="text-sm text-[#7A6B58] mb-3 line-clamp-2">
 {collection.description}
 </p>
 )}

 {/* Stats */}
 <div className="flex gap-4 text-sm text-[#7A6B58] mb-4 pb-4 border-b border-[rgba(184,115,51,0.14)]">
 <span>📍 {collection.place_count} mekan</span>
 {collection.follower_count !== undefined && (
 <span>👥 {collection.follower_count} takipçi</span>
 )}
 </div>

 {/* Actions */}
 <div className="flex gap-2">
 <a
 href={`/koleksiyonlar/${collection.id}`}
 className="flex-1 bg-[rgba(59,130,246,0.1)] text-blue-300 px-3 py-2 rounded text-center text-sm font-medium hover:bg-[rgba(59,130,246,0.18)] transition"
 >
 Aç
 </a>
 <button
 onClick={() => handleDeleteCollection(collection.id, collection.name)}
 className="flex-1 bg-[rgba(239,68,68,0.1)] text-red-700 px-3 py-2 rounded text-center text-sm font-medium hover:bg-[rgba(239,68,68,0.18)] transition"
 >
 Sil
 </button>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 );
}
