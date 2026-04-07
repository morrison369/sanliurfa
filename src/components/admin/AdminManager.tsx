import React, { useState } from 'react';

type ResourceType = 'places' | 'reviews' | 'users';

const RESOURCE_TABS = [
  { id: 'places' as const, label: 'Yerler', icon: '📍' },
  { id: 'reviews' as const, label: 'Yorumlar', icon: '⭐' },
  { id: 'users' as const, label: 'Kullanıcılar', icon: '👥' }
];

export default function AdminManager() {
  const [activeTab, setActiveTab] = useState<ResourceType>('places');
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  return (
    <div className="container-custom py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Yönetim Paneli</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Yerler, yorumlar ve kullanıcıları yönet</p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          {RESOURCE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        {activeTab === 'places' && <PlacesManager />}
        {activeTab === 'reviews' && <ReviewsManager />}
        {activeTab === 'users' && <UsersManager />}
      </div>
    </div>
  );
}

function PlacesManager() {
  const [filter, setFilter] = useState('');

  return (
    <div className="p-6">
      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Yer adı ara..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
          + Yeni Yer
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Adı</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Kategori</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Puan</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Durum</th>
              <th className="px-6 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-6 py-3 text-gray-900 dark:text-white font-medium">Göbeklitepe</td>
              <td className="px-6 py-3 text-gray-600 dark:text-gray-400">Tarihi</td>
              <td className="px-6 py-3 text-gray-600 dark:text-gray-400">4.8 ⭐</td>
              <td className="px-6 py-3"><span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded text-xs font-semibold">Yayında</span></td>
              <td className="px-6 py-3 text-right">
                <button className="text-blue-600 hover:underline text-sm mr-3">Düzenle</button>
                <button className="text-red-600 hover:underline text-sm">Sil</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
        Toplam: 1 yer
      </div>
    </div>
  );
}

function ReviewsManager() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <input
          type="text"
          placeholder="Yorum ara..."
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Kullanıcı</th>
            <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Yer</th>
            <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Puan</th>
            <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Durum</th>
            <th className="px-6 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">İşlemler</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td className="px-6 py-3 text-gray-900 dark:text-white font-medium">User123</td>
            <td className="px-6 py-3 text-gray-600 dark:text-gray-400">Balıklıgöl</td>
            <td className="px-6 py-3 text-gray-600 dark:text-gray-400">5 ⭐</td>
            <td className="px-6 py-3"><span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded text-xs font-semibold">Onaylandı</span></td>
            <td className="px-6 py-3 text-right">
              <button className="text-red-600 hover:underline text-sm">Reddet</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function UsersManager() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <input
          type="text"
          placeholder="Kullanıcı ara..."
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">E-posta</th>
            <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Rol</th>
            <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Katılım</th>
            <th className="px-6 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">İşlemler</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td className="px-6 py-3 text-gray-900 dark:text-white font-medium">user@example.com</td>
            <td className="px-6 py-3 text-gray-600 dark:text-gray-400">Kullanıcı</td>
            <td className="px-6 py-3 text-gray-600 dark:text-gray-400">2 gün önce</td>
            <td className="px-6 py-3 text-right">
              <button className="text-blue-600 hover:underline text-sm mr-3">Düzenle</button>
              <button className="text-red-600 hover:underline text-sm">Sil</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
