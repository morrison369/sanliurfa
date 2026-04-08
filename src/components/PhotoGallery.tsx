import React, { useState, useEffect } from 'react';

interface Photo {
  id: string;
  place_id: string;
  uploaded_by: string;
  file_path: string;
  alt_text?: string;
  caption?: string;
  is_featured: boolean;
  helpful_count: number;
  unhelpful_count: number;
  created_at: string;
}

interface PhotoGalleryProps {
  placeId: string;
  currentUserId?: string;
  isAdmin?: boolean;
}

export default function PhotoGallery({ placeId, currentUserId, isAdmin }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [altText, setAltText] = useState('');
  const [caption, setCaption] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [votedPhotos, setVotedPhotos] = useState<Record<string, 'helpful' | 'unhelpful'>>({});

  // Load photos on mount
  useEffect(() => {
    loadPhotos();
  }, [placeId]);

  const loadPhotos = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/places/${placeId}/photos?limit=50`);
      const data = await response.json();

      if (data.success) {
        setPhotos(data.data);
      }
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setUploadError('');
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      setUploadError('Lütfen bir dosya seçin');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('placeId', placeId);
      if (altText) formData.append('altText', altText);
      if (caption) formData.append('caption', caption);

      const response = await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setPhotos([data.data, ...photos]);
        setSelectedFile(null);
        setAltText('');
        setCaption('');
        setUploadError('');
      } else {
        setUploadError(data.error || 'Yükleme başarısız');
      }
    } catch (error) {
      setUploadError('Yükleme sırasında bir hata oluştu');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleVote = async (photoId: string, voteType: 'helpful' | 'unhelpful') => {
    if (!currentUserId) {
      alert('Oturum açmanız gerekiyor');
      return;
    }

    try {
      const response = await fetch(`/api/photos/${photoId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteType })
      });

      const data = await response.json();

      if (data.success) {
        setPhotos(photos.map(p => (p.id === photoId ? data.data : p)));
        setVotedPhotos(prev => ({ ...prev, [photoId]: voteType }));
      }
    } catch (error) {
      console.error('Vote error:', error);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Fotoğrafı silmek istediğinize emin misiniz?')) return;

    try {
      const response = await fetch(`/api/photos/${photoId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setPhotos(photos.filter(p => p.id !== photoId));
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleSetFeatured = async (photoId: string, isFeatured: boolean) => {
    try {
      const response = await fetch(`/api/photos/${photoId}/featured`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: !isFeatured })
      });

      const data = await response.json();

      if (data.success) {
        setPhotos(photos.map(p => (p.id === photoId ? data.data : p)));
      }
    } catch (error) {
      console.error('Featured update error:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      {currentUserId && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold mb-4">Fotoğraf Yükle</h3>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Fotoğraf Dosyası</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                disabled={isUploading}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">JPEG, PNG veya WebP (max 10MB)</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Alt Metni (Erişilebilirlik)</label>
              <input
                type="text"
                value={altText}
                onChange={e => setAltText(e.target.value)}
                placeholder="Fotoğrafın açıklaması"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Başlık/Açıklama</label>
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="İsteğe bağlı açıklama"
                rows={3}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            {uploadError && <p className="text-red-500 text-sm">{uploadError}</p>}

            <button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="w-full bg-blue-500 text-white py-2 rounded font-medium hover:bg-blue-600 disabled:opacity-50"
            >
              {isUploading ? 'Yükleniyor...' : 'Fotoğrafı Yükle'}
            </button>
          </form>
        </div>
      )}

      {/* Photos Grid */}
      <div>
        <h3 className="text-lg font-bold mb-4">Fotoğraflar ({photos.length})</h3>

        {isLoading ? (
          <div className="text-center py-12">Fotoğraflar yükleniyor...</div>
        ) : photos.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Henüz fotoğraf eklenmemiş</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map(photo => (
              <div key={photo.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 overflow-hidden">
                {/* Featured Badge */}
                {photo.is_featured && (
                  <div className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1">⭐ Öne Çıkartılmış</div>
                )}

                {/* Image */}
                <div className="aspect-square bg-gray-200 flex items-center justify-center overflow-hidden">
                  <img
                    src={photo.file_path}
                    alt={photo.alt_text || 'Mekan fotoğrafı'}
                    className="w-full h-full object-cover"
                    onError={e => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22400%22%3E%3Crect fill=%22%23e5e7eb%22 width=%22400%22 height=%22400%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 font-family=%22sans-serif%22 font-size=%2216%22 fill=%22%239ca3af%22%3EFotoğraf Yüklenemedi%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>

                {/* Caption */}
                {photo.caption && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 p-3 border-b border-gray-200">{photo.caption}</p>
                )}

                {/* Vote Buttons */}
                <div className="p-3 border-b border-gray-200 flex gap-3 text-sm">
                  <button
                    onClick={() => handleVote(photo.id, 'helpful')}
                    className={`flex-1 py-1 rounded ${
                      votedPhotos[photo.id] === 'helpful'
                        ? 'bg-green-100 text-green-700 font-medium'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    👍 {photo.helpful_count}
                  </button>
                  <button
                    onClick={() => handleVote(photo.id, 'unhelpful')}
                    className={`flex-1 py-1 rounded ${
                      votedPhotos[photo.id] === 'unhelpful'
                        ? 'bg-red-100 text-red-700 font-medium'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    👎 {photo.unhelpful_count}
                  </button>
                </div>

                {/* Actions */}
                {(currentUserId === photo.uploaded_by || isAdmin) && (
                  <div className="p-3 flex gap-2 text-xs">
                    <button
                      onClick={() => handleSetFeatured(photo.id, photo.is_featured)}
                      className="flex-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                    >
                      {photo.is_featured ? '⭐ Öne Çık' : '☆ Öne Çık'}
                    </button>
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="flex-1 px-2 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200"
                    >
                      🗑️ Sil
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
