import React, { useState } from "react";

export default function VendorDashboard() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "listings" | "reviews" | "ads"
  >("overview");

  const ctaClass =
    "inline-flex items-center justify-center px-6 py-2 bg-urfa-700 text-white rounded-lg hover:bg-urfa-800 transition-colors";

  return (
    <div className="container-custom py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        İşletme paneli
      </h1>

      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        {[
          { id: "overview" as const, label: "Genel bakış" },
          { id: "listings" as const, label: "İşletmelerim" },
          { id: "reviews" as const, label: "Yorumlar" },
          { id: "ads" as const, label: "Reklamlar" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-urfa-700 text-urfa-700"
                : "border-transparent text-gray-600 dark:text-gray-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Toplam görüntüleme
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                0
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Mekân eklendiğinde dolar.
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Yorum yanıt oranı
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                0%
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Yorum geldikçe hesaplanır.
              </p>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ortalama puan
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                -
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                İlk puandan sonra görünür.
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Aktif reklamlar
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                0
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Kampanya oluşturunca artar.
              </p>
            </div>
          </div>
        )}

        {activeTab === "listings" && (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Henüz işletme eklemediniz
            </h2>
            <p className="mb-4">
              İlk işletmenizi ekleyerek Şanlıurfa rehberinde görünür olun.
              Onaylandıktan sonra analitik, yorum ve pazarlama akışları bu
              panele bağlanır.
            </p>
            <a href="/places/ekle" className={ctaClass}>
              İşletme ekle
            </a>
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Henüz yanıt bekleyen yorum yok
            </h2>
            <p className="mb-4">
              İşletmenize yorum geldiğinde burada listelenir. Yorumlara hızlı
              yanıt vermek güven ve görünürlük sinyalini güçlendirir.
            </p>
            <a href="/isletme/analytics" className={ctaClass}>
              Analitikleri görüntüle
            </a>
          </div>
        )}

        {activeTab === "ads" && (
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Henüz kampanyanız yok
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              İşletmenizi öne çıkarmak için öne çıkan listeleme veya kampanya
              oluşturun.
            </p>
            <a href="/isletme/pazarlama" className={ctaClass}>
              Kampanya oluştur
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
