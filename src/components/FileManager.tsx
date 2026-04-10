/**
 * File Manager Component
 * Upload files, manage variants, track access
 */

import { useState } from 'react';

export function FileManager() {
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('is_public', 'false');

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        setFiles([...files, data.data]);
      }
    } catch (error) {
      console.error('Upload failed', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-bold text-lg mb-4">Dosya Yöneticisi</h2>

        <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
          <label className="cursor-pointer">
            <input
              type="file"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
            <div className="text-center">
              <p className="text-gray-600">Dosya seçmek için tıklayın</p>
              <p className="text-sm text-gray-400">veya sürükle-bırak yap</p>
            </div>
          </label>
        </div>

        {uploading && <p className="text-center text-gray-500">Yükleniyor...</p>}

        <div className="space-y-2">
          {files.map((file: any) => (
            <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <p className="font-medium">{file.original_filename}</p>
                <p className="text-sm text-gray-500">{(file.file_size_bytes / 1024 / 1024).toFixed(2)} MB</p>
                {file.public_url && (
                  <a href={file.public_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                    Dosyayı aç
                  </a>
                )}
              </div>
              <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                Detaylar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
