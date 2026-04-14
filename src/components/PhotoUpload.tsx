import React, { useState, useRef, useCallback } from 'react';

interface Photo {
  id: string;
  url: string;
  thumbnail_url: string;
  caption: string | null;
  photo_type: string;
  is_primary: boolean;
}

interface PhotoUploadProps {
  placeId: string;
  photos: Photo[];
  onUpload?: (photo: Photo) => void;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, data: Partial<Photo>) => void;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function PhotoUpload({ placeId, photos, onUpload, onDelete, onUpdate }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Sadece JPEG, PNG, WebP ve GIF dosyaları yüklenebilir.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'Dosya boyutu 10MB dan büyük olamaz.';
    }
    return null;
  };

  const uploadFile = async (file: File, type: string = 'gallery') => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('placeId', placeId);
    formData.append('type', type);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Yükleme başarısız');
      }

      const data = await response.json();
      onUpload?.(data.photo);
    } catch (err: any) {
      setError(err.message || 'Yükleme sırasında bir hata oluştu');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleSetPrimary = async (id: string) => {
    try {
      const response = await fetch(`/api/upload/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrimary: true }),
      });

      if (!response.ok) throw new Error('Güncelleme başarısız');
      
      onUpdate?.(id, { is_primary: true });
    } catch (err) {
      setError('Kapak fotoğrafı ayarlanamadı');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu fotoğrafı silmek istediğinize emin misiniz?')) return;

    try {
      const response = await fetch(`/api/upload/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Silme başarısız');
      
      onDelete?.(id);
    } catch (err) {
      setError('Fotoğraf silinemedi');
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          <button 
            onClick={() => setError(null)}
            className="float-right text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Upload Area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-200
          ${dragOver 
            ? 'border-red-500 bg-red-50' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${uploading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {uploading ? (
          <div className="space-y-3">
            <div className="w-12 h-12 mx-auto border-3 border-red-200 border-t-red-600 rounded-full animate-spin" />
            <p className="text-gray-600">Yükleniyor...</p>
            <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-2">
              <div 
                className="bg-red-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-700 font-medium mb-1">
              Fotoğraf yüklemek için tıklayın veya sürükleyin
            </p>
            <p className="text-gray-500 text-sm">
              JPEG, PNG, WebP, GIF • Max 10MB
            </p>
          </>
        )}
      </div>

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Yüklenen Fotoğraflar ({photos.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div 
                key={photo.id}
                className={`
                  relative group rounded-lg overflow-hidden aspect-square
                  ${photo.is_primary ? 'ring-2 ring-red-500' : ''}
                `}
              >
                <img
                  src={photo.thumbnail_url || photo.url}
                  alt={photo.caption || 'Fotoğraf'}
                  className="w-full h-full object-cover"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                  {photo.is_primary ? (
                    <span className="absolute top-2 left-2 px-2 py-1 bg-red-600 text-white text-xs rounded">
                      Kapak
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetPrimary(photo.id)}
                      className="absolute top-2 left-2 px-2 py-1 bg-white/90 text-gray-800 text-xs rounded hover:bg-white"
                    >
                      Kapak Yap
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDelete(photo.id)}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  
                  {photo.caption && (
                    <p className="text-white text-xs truncate">{photo.caption}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
