import React, { useState, useRef, useCallback } from 'react';
import { ImagePlus, X } from 'lucide-react';

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

interface QueuedFile {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function uploadWithProgress(url: string, formData: FormData, onProgress: (pct: number) => void): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        try { reject(new Error(JSON.parse(xhr.responseText)?.error || 'Yükleme başarısız')); }
        catch { reject(new Error('Yükleme başarısız')); }
      }
    };
    xhr.onerror = () => reject(new Error('Ağ hatası'));
    xhr.send(formData);
  });
}

export default function PhotoUpload({ placeId, photos, onUpload, onDelete, onUpdate }: PhotoUploadProps) {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const enqueueFiles = useCallback((files: FileList | File[]) => {
    const fileArr = Array.from(files);
    const newItems: QueuedFile[] = [];

    for (const file of fileArr) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`${file.name}: Yalnızca JPEG, PNG, WebP veya GIF yüklenebilir.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name}: 10MB sınırını aşıyor (${formatSize(file.size)}).`);
        continue;
      }
      newItems.push({
        id: `${Date.now()}-${Array.from(globalThis.crypto.getRandomValues(new Uint8Array(4))).map(b => b.toString(16).padStart(2, '0')).join('')}`,
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
        status: 'pending',
      });
    }

    if (newItems.length > 0) {
      setError(null);
      setQueue(q => [...q, ...newItems]);
      newItems.forEach(item => startUpload(item));
    }
  }, [placeId]);

  const startUpload = async (item: QueuedFile) => {
    setQueue(q => q.map(i => i.id === item.id ? { ...i, status: 'uploading' } : i));

    const formData = new FormData();
    formData.append('file', item.file);
    formData.append('placeId', placeId);
    formData.append('type', 'gallery');

    try {
      const data = await uploadWithProgress(
        '/api/upload',
        formData,
        pct => setQueue(q => q.map(i => i.id === item.id ? { ...i, progress: pct } : i)),
      );
      setQueue(q => q.map(i => i.id === item.id ? { ...i, status: 'done', progress: 100 } : i));
      onUpload?.(data.photo);
      // Tamamlananı kuyruğdan 2 sn sonra kaldır
      setTimeout(() => {
        setQueue(q => q.filter(i => i.id !== item.id));
        URL.revokeObjectURL(item.preview);
      }, 2000);
    } catch (err) {
      setQueue(q => q.map(i => i.id === item.id ? { ...i, status: 'error', error: err.message } : i));
    }
  };

  const removeFromQueue = (id: string) => {
    setQueue(q => {
      const item = q.find(i => i.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return q.filter(i => i.id !== id);
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    enqueueFiles(e.dataTransfer.files);
  }, [enqueueFiles]);

  const handleSetPrimary = async (id: string) => {
    try {
      const res = await fetch(`/api/upload/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrimary: true }),
      });
      if (!res.ok) throw new Error();
      onUpdate?.(id, { is_primary: true });
    } catch {
      setError('Kapak fotoğrafı ayarlanamadı');
    }
  };

  const handleDelete = async (id: string) => {
    if (!await (window as any).showConfirm?.('Bu fotoğrafı silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/upload/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onDelete?.(id);
    } catch {
      setError('Fotoğraf silinemedi');
    }
  };

  const isUploading = queue.some(i => i.status === 'uploading' || i.status === 'pending');

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 ml-2">✕</button>
        </div>
      )}

      {/* Drop Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          dragOver ? 'border-red-500 bg-red-50 scale-[1.01]' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={e => e.target.files && enqueueFiles(e.target.files)}
          className="hidden"
        />
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <ImagePlus className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-700 font-medium mb-1">Fotoğraf yüklemek için tıklayın veya sürükleyin</p>
        <p className="text-gray-500 text-sm">JPEG, PNG, WebP, GIF • Birden fazla seçilebilir • Max 10MB/dosya</p>
      </div>

      {/* Upload Queue */}
      {queue.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Yükleme Kuyruğu</h4>
          {queue.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <img src={item.preview} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{item.file.name}</p>
                <p className="text-xs text-gray-500">{formatSize(item.file.size)}</p>
                {(item.status === 'uploading' || item.status === 'pending') && (
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-red-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
                {item.status === 'error' && (
                  <p className="text-xs text-red-600 mt-1">{item.error}</p>
                )}
              </div>
              <div className="flex-shrink-0 text-lg">
                {item.status === 'uploading' && <span className="animate-spin inline-block">⏳</span>}
                {item.status === 'done' && <span className="text-green-500">✓</span>}
                {item.status === 'error' && (
                  <button onClick={() => removeFromQueue(item.id)} className="text-red-400 hover:text-red-600">✕</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded Photos Grid */}
      {photos.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Yüklenen Fotoğraflar ({photos.length})</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.map(photo => (
              <div
                key={photo.id}
                className={`relative group rounded-lg overflow-hidden aspect-square ${photo.is_primary ? 'ring-2 ring-red-500' : ''}`}
              >
                <img
                  src={photo.thumbnail_url || photo.url}
                  alt={photo.caption || 'Fotoğraf'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                  {photo.is_primary ? (
                    <span className="absolute top-2 left-2 px-2 py-1 bg-red-600 text-white text-xs rounded">Kapak</span>
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
                    <X className="w-4 h-4" />
                  </button>
                  {photo.caption && <p className="text-white text-xs truncate">{photo.caption}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
