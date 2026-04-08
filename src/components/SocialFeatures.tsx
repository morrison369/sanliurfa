import { useState, useEffect } from 'react';

export function SocialFeatures() {
  const [activeTab, setActiveTab] = useState<'feed' | 'trending' | 'follows'>('feed');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      let url = '';
      switch (activeTab) {
        case 'feed':
          url = '/api/social/feed';
          break;
        case 'trending':
          url = '/api/social/trending?type=hashtags';
          break;
        case 'follows':
          url = '/api/social/follows?type=followers';
          break;
      }

      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setData(Array.isArray(result.data) ? result.data : result.data.users || []);
      }
    } catch (error) {
      console.error('Failed to load data', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveTab('feed')}
          className={`px-4 py-2 ${activeTab === 'feed' ? 'border-b-2 border-blue-600 font-bold' : 'text-gray-600'}`}
        >
          Aktivite Akışı
        </button>
        <button
          onClick={() => setActiveTab('trending')}
          className={`px-4 py-2 ${activeTab === 'trending' ? 'border-b-2 border-blue-600 font-bold' : 'text-gray-600'}`}
        >
          Trendiyor
        </button>
        <button
          onClick={() => setActiveTab('follows')}
          className={`px-4 py-2 ${activeTab === 'follows' ? 'border-b-2 border-blue-600 font-bold' : 'text-gray-600'}`}
        >
          Takipçiler
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
      ) : (
        <div className="space-y-3">
          {data.length === 0 ? (
            <p className="text-center text-gray-500">Veri bulunamadı</p>
          ) : (
            data.map((item: any) => (
              <div key={item.id} className="bg-white border rounded-lg p-4">
                {activeTab === 'feed' && (
                  <div>
                    <p className="font-medium">{item.activity_type}</p>
                    <p className="text-sm text-gray-600">{item.object_title}</p>
                  </div>
                )}
                {activeTab === 'trending' && (
                  <div>
                    <p className="font-medium">#{item.tag_name}</p>
                    <p className="text-sm text-gray-600">{item.usage_count} kullannım</p>
                  </div>
                )}
                {activeTab === 'follows' && (
                  <div>
                    <p className="font-medium">{item.full_name}</p>
                    <p className="text-sm text-gray-600">{item.email}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
