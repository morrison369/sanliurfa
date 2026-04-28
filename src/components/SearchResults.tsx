import { useState, useEffect } from 'react';
interface Place {
  id: string;
  slug?: string;
  name: string;
  category: string;
  image_url?: string;
  rating?: number;
}

interface User {
  id: string;
  full_name: string;
  username?: string;
  avatar_url?: string;
}

interface Collection {
  id: string;
  name: string;
  description?: string;
}

interface SearchResults {
  places: Place[];
  users: User[];
  collections: Collection[];
}

export default function SearchResults({ query }: { query?: string }) {
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(query || '');

  useEffect(() => {
    if (searchQuery.length >= 2) {
      performSearch();
    }
  }, [searchQuery]);

  const performSearch = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/search?q=' + encodeURIComponent(searchQuery) + '&limit=50');
      if (!response.ok) throw new Error('Arama tamamlanamadı.');
      const data = await response.json();
      setResults(data.data);
    } catch (err) {
      console.error('Arama hatası:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Mekan, kullanıcı veya koleksiyon ara..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {searchQuery.length < 2 ? (
        <p className="text-center text-gray-600">En az 2 karakter girin</p>
      ) : isLoading ? (
        <div className="space-y-6 animate-pulse">
          <div>
            <div className="h-5 bg-gray-200 rounded w-32 mb-3" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 border border-gray-100 rounded-lg space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : !results || (results.places.length === 0 && results.users.length === 0 && results.collections.length === 0) ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-medium">"{searchQuery}" için sonuç bulunamadı.</p>
          <p className="text-sm mt-1">Farklı bir anahtar kelime deneyin.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {results.places && results.places.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Mekanlar ({results.places.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.places.map((place) => (
                  <a key={place.id} href={place.slug ? `/isletme/${place.slug}` : '/mekanlar'} className="p-4 bg-white dark:bg-gray-800 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                    {place.image_url && <img src={place.image_url} alt={place.name} className="w-full h-32 object-cover rounded mb-2" />}
                    <p className="font-medium text-gray-900 dark:text-white">{place.name}</p>
                    <p className="text-sm text-gray-600">{place.category}</p>
                    {place.rating && <p className="text-sm text-yellow-600">⭐ {place.rating.toFixed(1)}</p>}
                  </a>
                ))}
              </div>
            </div>
          )}

          {results.users && results.users.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Kullanıcılar ({results.users.length})</h3>
              <div className="space-y-2">
                {results.users.map((user) => (
                  <a key={user.id} href={'/kullanici/' + user.id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.full_name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold">
                        {user.full_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{user.full_name}</p>
                      <p className="text-sm text-gray-600">@{user.username || 'kullanici'}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {results.collections && results.collections.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Koleksiyonlar ({results.collections.length})</h3>
              <div className="space-y-2">
                {results.collections.map((col) => (
                  <a key={col.id} href={'/koleksiyonlar/' + col.id} className="p-3 bg-white dark:bg-gray-800 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                    <p className="font-medium text-gray-900 dark:text-white">{col.name}</p>
                    <p className="text-sm text-gray-600">{col.description}</p>
                  </a>
                ))}
              </div>
            </div>
          )}

          {!results.places?.length && !results.users?.length && !results.collections?.length && (
            <p className="text-center text-gray-600">Sonuç bulunamadı</p>
          )}
        </div>
      )}
    </div>
  );
}
