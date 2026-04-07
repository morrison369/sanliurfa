import React, { useState } from 'react';

export default function VendorDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'reviews' | 'ads'>('overview');

  return (
    <div className="container-custom py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">İşletme Paneli</h1>

      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'overview' as const, label: 'Genel Bakış' },
          { id: 'listings' as const, label: 'İşletmelerim' },
          { id: 'reviews' as const, label: 'Yorumlar' },
          { id: 'ads' as const, label: 'Reklamlar' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Görüntüleme</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">1,234</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Yorum Yanıt Oranı</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">85%</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Ortalama Puan</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">4.7 ⭐</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Aktif Reklamlar</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">3</p>
            </div>
          </div>
        )}

        {activeTab === 'listings' && (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            <p className="mb-4">İşletmeleriniz burada görünecek</p>
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              + İşletme Ekle
            </button>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-4">
            <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
              <p className="font-semibold text-gray-900 dark:text-white">Muhteşem hizmet!</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">⭐⭐⭐⭐⭐ - User123</p>
              <button className="text-sm text-blue-600 hover:underline mt-2">Yanıt Ver</button>
            </div>
          </div>
        )}

        {activeTab === 'ads' && (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400 mb-4">Reklam kampanyaları yönetilecek</p>
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              + Reklam Oluştur
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
