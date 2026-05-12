import { useState, useEffect } from 'react';
interface CollectionItem {
 id: string;
 place_id: string;
 place_slug?: string;
 place_name: string;
 place_image?: string;
 place_category?: string;
 place_rating?: number;
 note?: string;
 position: number;
 added_at: string;
}

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

interface CollectionDetailProps {
 collectionId: string;
 currentUserId?: string;
 isAdmin?: boolean;
}

export default function CollectionDetail({
 collectionId,
 currentUserId
}: CollectionDetailProps) {
 const [collection, setCollection] = useState<Collection | null>(null);
 const [items, setItems] = useState<CollectionItem[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [isFollowing, setIsFollowing] = useState(false);
 const [isFollowingLoading, setIsFollowingLoading] = useState(false);
 const [error, setError] = useState('');

 // Load collection on mount
 useEffect(() => {
 loadCollection();
 }, [collectionId, currentUserId]);

 const loadCollection = async () => {
 try {
 setIsLoading(true);
 const response = await fetch(`/api/collections/${collectionId}`);
 const data = await response.json();

 if (data.success) {
 setCollection(data.data.collection);
 setItems(data.data.items);
 } else if (response.status === 404) {
 setError('Koleksiyon bulunamadı');
 } else {
 setError(data.error || 'Koleksiyon yüklenemedi');
 }
 } catch (err) {
 console.error('Failed to load collection:', err);
 setError('Koleksiyon yüklenirken bir hata oluştu');
 } finally {
 setIsLoading(false);
 }

 // Check follow status if authenticated
 if (currentUserId && collection?.id) {
 checkFollowStatus();
 }
 };

 const checkFollowStatus = async () => {
 try {
 const response = await fetch(`/api/collections/${collectionId}/followers/check`);
 const data = await response.json();
 if (data.success) {
 setIsFollowing(data.data.is_following);
 }
 } catch (err) {
 console.error('Failed to check follow status:', err);
 }
 };

 const handleFollow = async () => {
 if (!currentUserId) {
 window.location.href = '/giris';
 return;
 }

 try {
 setIsFollowingLoading(true);
 const method = isFollowing ? 'DELETE' : 'POST';
 const response = await fetch(`/api/collections/${collectionId}/followers`, {
 method,
 headers: { 'Content-Type': 'application/json' }
 });

 const data = await response.json();

 if (data.success) {
 setIsFollowing(!isFollowing);
 }
 } catch (err) {
 console.error('Follow error:', err);
 } finally {
 setIsFollowingLoading(false);
 }
 };

 const handleRemoveItem = async (itemId: string) => {
 if (!collection || currentUserId !== collection.user_id) {
 return;
 }

 if (!await (window as any).showConfirm?.('Mekanı koleksiyondan kaldırmak istediğinize emin misiniz?')) return;

 try {
 const response = await fetch(`/api/collections/${collectionId}/items/${itemId}`, {
 method: 'DELETE'
 });

 const data = await response.json();

 if (data.success) {
 setItems(items.filter(item => item.id !== itemId));
 }
 } catch (err) {
 console.error('Remove item error:', err);
 }
 };

 if (isLoading) {
 return <div className="text-center py-12">Koleksiyon yükleniyor...</div>;
 }

 if (error) {
 return (
 <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-red-400 px-4 py-3 rounded-sm">
 {error}
 </div>
 );
 }

 if (!collection) {
 return <div className="text-center py-12 text-[#7A6B58]">Koleksiyon bulunamadı</div>;
 }

 const isOwner = currentUserId === collection.user_id;

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-6">
 <div className="flex items-start justify-between gap-4">
 <div>
 <div className="flex items-center gap-3 mb-3">
 <span className="text-5xl">{collection.icon}</span>
 <div>
 <h1 className="text-3xl font-bold">{collection.name}</h1>
 {collection.is_public && (
 <span className="text-sm bg-[rgba(34,197,94,0.12)] text-green-400 px-2 py-1 rounded inline-block">
 🌍 Herkese Açık
 </span>
 )}
 </div>
 </div>

 {collection.description && (
 <p className="text-[#7A6B58] mb-4">{collection.description}</p>
 )}

 <div className="flex gap-6 text-sm text-[#7A6B58]">
 <span>📍 {collection.place_count} mekan</span>
 <span>👥 {collection.follower_count || 0} takipçi</span>
 </div>
 </div>

 <div className="flex flex-col gap-2">
 {collection.is_public && currentUserId && !isOwner && (
 <button
 onClick={handleFollow}
 disabled={isFollowingLoading}
 className={`px-4 py-2 rounded font-medium whitespace-nowrap ${
 isFollowing
 ? 'bg-[rgba(184,115,51,0.2)] text-white hover:bg-[var(--bg-card)]'
 : 'bg-urfa-600 text-white hover:bg-urfa-700'
 } disabled:opacity-50`}
 >
 {isFollowingLoading ? 'İşleniyor...' : isFollowing ? 'Takipten Çık' : 'Takip Et'}
 </button>
 )}

 {isOwner && (
 <a
 href={`/koleksiyonlar`}
 className="px-4 py-2 bg-[rgba(184,115,51,0.15)] text-white rounded font-medium text-center hover:bg-[rgba(184,115,51,0.2)]"
 >
 Düzenle
 </a>
 )}
 </div>
 </div>
 </div>

 {/* Items Grid */}
 <div>
 <h2 className="text-2xl font-bold mb-4">Mekanlar</h2>

 {items.length === 0 ? (
 <div className="text-center py-12 text-[#7A6B58]">
 Bu koleksiyonda henüz mekan eklenmemiş
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {items.map(item => (
 <div
 key={item.id}
 className="bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] overflow-hidden hover:shadow-lg transition"
 >
 {/* Image */}
 {item.place_image && (
 <div className="aspect-video bg-[rgba(184,115,51,0.08)] overflow-hidden">
 <img
 src={item.place_image}
 alt={item.place_name}
 className="w-full h-full object-cover"
 />
 </div>
 )}

 {/* Content */}
 <div className="p-4">
 <a
 href={item.place_slug ? `/isletme/${item.place_slug}` : '/mekanlar'}
 className="text-lg font-bold text-[#1F1410] hover:text-[#B87333] block mb-2"
 >
 {item.place_name}
 </a>

 <div className="flex gap-3 text-sm text-[#7A6B58] mb-3">
 {item.place_category && <span>📁 {item.place_category}</span>}
 {item.place_rating && (
 <span>⭐ {item.place_rating.toFixed(1)}</span>
 )}
 </div>

 {item.note && (
 <p className="text-sm text-[#7A6B58] mb-3 p-2 bg-[rgba(184,115,51,0.06)] rounded">
 "{item.note}"
 </p>
 )}

 {/* Actions */}
 <div className="flex gap-2">
 <a
 href={item.place_slug ? `/isletme/${item.place_slug}` : '/mekanlar'}
 className="flex-1 text-center bg-[rgba(59,130,246,0.1)] text-blue-300 px-3 py-2 rounded text-sm font-medium hover:bg-[rgba(59,130,246,0.18)] transition"
 >
 Mekanı Gör
 </a>
 {isOwner && (
 <button
 onClick={() => handleRemoveItem(item.id)}
 className="flex-1 bg-[rgba(239,68,68,0.1)] text-red-400 px-3 py-2 rounded-sm text-sm font-medium hover:bg-[rgba(239,68,68,0.18)] transition"
 >
 Kaldır
 </button>
 )}
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 );
}
