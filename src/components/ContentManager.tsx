/**
 * Content Manager Component
 * Create, edit, and publish content
 */
import { useEffect, useState } from 'react';

interface ContentItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  visibility: string;
  view_count: number;
  like_count: number;
  published_at?: string;
  created_at: string;
}

export function ContentManager() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    category: '',
    content_type: 'article'
  });

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/content');
      if (res.ok) {
        const data = await res.json();
        setContent(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch content', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContent = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setFormData({
          title: '',
          description: '',
          content: '',
          category: '',
          content_type: 'article'
        });
        setShowForm(false);
        await fetchContent();
      }
    } catch (err) {
      console.error('Failed to create content', err);
    }
  };

  const handlePublish = async (contentId: string) => {
    try {
      const res = await fetch(`/api/content/${contentId}/publish`, { method: 'POST' });
      if (res.ok) {
        await fetchContent();
      }
    } catch (err) {
      console.error('Failed to publish content', err);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Create Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          + Yeni İçerik Oluştur
        </button>
      )}

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreateContent} className="bg-white rounded-lg shadow p-6 space-y-4">
          <input
            type="text"
            placeholder="Başlık"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <textarea
            placeholder="Açıklama"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
          />

          <textarea
            placeholder="İçerik"
            required
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-40"
          />

          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Kategori"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={formData.content_type}
              onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="article">Makale</option>
              <option value="guide">Rehber</option>
              <option value="news">Haber</option>
              <option value="review">İnceleme</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Oluştur
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-medium"
            >
              İptal
            </button>
          </div>
        </form>
      )}

      {/* Content List */}
      {content.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">Henüz içerik oluşturulmadı.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {content.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{item.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>

                  <div className="flex gap-4 mt-3 text-sm text-gray-500">
                    <span>📅 {new Date(item.created_at).toLocaleDateString('tr-TR')}</span>
                    <span>👁️ {item.view_count} görüntüleme</span>
                    <span>❤️ {item.like_count} beğeni</span>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      item.status === 'published'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {item.status === 'published' ? 'Yayınlandı' : 'Taslak'}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      item.visibility === 'public'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {item.visibility === 'public' ? 'Açık' : 'Özel'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <a
                    href={`/content/${item.id}`}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Düzenle
                  </a>

                  {item.status !== 'published' && (
                    <button
                      onClick={() => handlePublish(item.id)}
                      className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                    >
                      Yayınla
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
