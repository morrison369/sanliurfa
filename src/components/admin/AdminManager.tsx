const ADMIN_SECTIONS = [
  {
    title: 'Mekanlar',
    description: 'Mekan kayıtlarını listele, ekle ve düzenle.',
    href: '/admin/places',
  },
  {
    title: 'Yorumlar',
    description: 'Onay bekleyen yorumları incele ve modere et.',
    href: '/admin/reviews',
  },
  {
    title: 'Kullanıcılar',
    description: 'Kullanıcı hesaplarını ve yetki durumlarını yönet.',
    href: '/admin/users',
  },
  {
    title: 'Blog',
    description: 'Blog yazılarını, yorumlarını ve yayın akışını yönet.',
    href: '/admin/blog',
  },
  {
    title: 'Etkinlikler',
    description: 'Şanlıurfa etkinliklerini ekle ve güncelle.',
    href: '/admin/events',
  },
  {
    title: 'Tarihi Yerler',
    description: 'Tarihi miras içeriklerini ve görsellerini yönet.',
    href: '/admin/historical-sites',
  },
];

export default function AdminManager() {
  return (
    <div className="container-custom py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Yönetim Merkezi</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Sahte tablo verisi yerine doğrudan gerçek admin modüllerine gidin.
        </p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {ADMIN_SECTIONS.map((section) => (
          <a
            key={section.href}
            href={section.href}
            className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:border-urfa-300 dark:hover:border-urfa-700 transition"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{section.title}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{section.description}</p>
            <span className="inline-block mt-4 text-sm font-medium text-urfa-600 dark:text-urfa-400">
              Aç
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
