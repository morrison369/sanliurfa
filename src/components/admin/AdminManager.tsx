import { useState } from 'react';
type ResourceType = 'places' | 'reviews' | 'users';

const RESOURCE_TABS = [
 { id: 'places' as const, label: 'Yerler', icon: '📍' },
 { id: 'reviews' as const, label: 'Yorumlar', icon: '⭐' },
 { id: 'users' as const, label: 'Kullanıcılar', icon: '👥' }
];

export default function AdminManager() {
 const [activeTab, setActiveTab] = useState<ResourceType>('places');

 return (
 <div className="container-custom py-8">
 {/* Header */}
 <div className="mb-8">
 <h1 className="text-3xl font-bold text-[#1F1410]">Yönetim Paneli</h1>
 <p className="text-[#7A6B58] mt-2">Yerler, yorumlar ve kullanıcıları yönet</p>
 </div>

 {/* Tabs */}
 <div className="mb-6">
 <div className="flex gap-2 border-b border-[rgba(184,115,51,0.14)]">
 {RESOURCE_TABS.map((tab) => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
 activeTab === tab.id
 ? 'border-urfa-500 text-[#7A6B58]'
 : 'border-transparent text-[#7A6B58]'
 }`}
 >
 {tab.icon} {tab.label}
 </button>
 ))}
 </div>
 </div>

 {/* Content */}
 <div className="bg-[var(--bg-card)] rounded-sm shadow border border-[rgba(184,115,51,0.14)]">
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
 className="flex-1 px-4 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm bg-[var(--bg-card)] text-[#1F1410]"
 />
 <button className="px-6 py-2 bg-urfa-600 text-white rounded-sm hover:bg-urfa-700 font-medium">
 + Yeni Yer
 </button>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-[rgba(184,115,51,0.04)] ">
 <tr>
 <th className="px-6 py-3 text-left font-semibold text-[#7A6B58]">Adı</th>
 <th className="px-6 py-3 text-left font-semibold text-[#7A6B58]">Kategori</th>
 <th className="px-6 py-3 text-left font-semibold text-[#7A6B58]">Puan</th>
 <th className="px-6 py-3 text-left font-semibold text-[#7A6B58]">Durum</th>
 <th className="px-6 py-3 text-right font-semibold text-[#7A6B58]">İşlemler</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[rgba(184,115,51,0.14)]">
 <tr className="hover:bg-[rgba(184,115,51,0.04)] ">
 <td className="px-6 py-3 text-[#1F1410] font-medium">Göbeklitepe</td>
 <td className="px-6 py-3 text-[#7A6B58]">Tarihi</td>
 <td className="px-6 py-3 text-[#7A6B58]">4.8 ⭐</td>
 <td className="px-6 py-3"><span className="px-2 py-1 bg-[rgba(34,197,94,0.12)] text-green-400 rounded text-xs font-semibold">Yayında</span></td>
 <td className="px-6 py-3 text-right">
 <button className="text-[#7A6B58] hover:underline text-sm mr-3">Düzenle</button>
 <button className="text-red-600 hover:underline text-sm">Sil</button>
 </td>
 </tr>
 </tbody>
 </table>
 </div>

 <div className="mt-6 text-sm text-[#7A6B58]">
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
 className="w-full px-4 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm bg-[var(--bg-card)] text-[#1F1410]"
 />
 </div>

 <table className="w-full text-sm">
 <thead className="bg-[rgba(184,115,51,0.04)] ">
 <tr>
 <th className="px-6 py-3 text-left font-semibold text-[#7A6B58]">Kullanıcı</th>
 <th className="px-6 py-3 text-left font-semibold text-[#7A6B58]">Yer</th>
 <th className="px-6 py-3 text-left font-semibold text-[#7A6B58]">Puan</th>
 <th className="px-6 py-3 text-left font-semibold text-[#7A6B58]">Durum</th>
 <th className="px-6 py-3 text-right font-semibold text-[#7A6B58]">İşlemler</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[rgba(184,115,51,0.14)]">
 <tr className="hover:bg-[rgba(184,115,51,0.04)] ">
 <td className="px-6 py-3 text-[#1F1410] font-medium">User123</td>
 <td className="px-6 py-3 text-[#7A6B58]">Balıklıgöl</td>
 <td className="px-6 py-3 text-[#7A6B58]">5 ⭐</td>
 <td className="px-6 py-3"><span className="px-2 py-1 bg-[rgba(34,197,94,0.12)] text-green-400 rounded text-xs font-semibold">Onaylandı</span></td>
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
 className="w-full px-4 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm bg-[var(--bg-card)] text-[#1F1410]"
 />
 </div>

 <table className="w-full text-sm">
 <thead className="bg-[rgba(184,115,51,0.04)] ">
 <tr>
 <th className="px-6 py-3 text-left font-semibold text-[#7A6B58]">E-posta</th>
 <th className="px-6 py-3 text-left font-semibold text-[#7A6B58]">Rol</th>
 <th className="px-6 py-3 text-left font-semibold text-[#7A6B58]">Katılım</th>
 <th className="px-6 py-3 text-right font-semibold text-[#7A6B58]">İşlemler</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[rgba(184,115,51,0.14)]">
 <tr className="hover:bg-[rgba(184,115,51,0.04)] ">
 <td className="px-6 py-3 text-[#1F1410] font-medium">kullanici.ornek@sanliurfa.com</td>
 <td className="px-6 py-3 text-[#7A6B58]">Kullanıcı</td>
 <td className="px-6 py-3 text-[#7A6B58]">2 gün önce</td>
 <td className="px-6 py-3 text-right">
 <button className="text-[#7A6B58] hover:underline text-sm mr-3">Düzenle</button>
 <button className="text-red-600 hover:underline text-sm">Sil</button>
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 );
}
