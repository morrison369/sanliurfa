import { query } from '../lib/postgres';

export async function up() {
  // pharmacies tablosu 154_db_first_platform_expansion'da oluşturulmuştu
  // Önce districts tablosundan Şanlıurfa merkez ilçe ID'sini al
  const distResult = await query(
    `SELECT id FROM districts WHERE slug = 'haliliye' OR name ILIKE '%haliliye%' LIMIT 1`,
    [],
  );
  const haliliyeId = distResult.rows[0]?.id || null;

  const kResult = await query(
    `SELECT id FROM districts WHERE slug = 'karakopru' OR name ILIKE '%karaköprü%' OR name ILIKE '%karakopru%' LIMIT 1`,
    [],
  );
  const karakopruId = kResult.rows[0]?.id || null;

  const eyResult = await query(
    `SELECT id FROM districts WHERE slug = 'eyup-nebi' OR name ILIKE '%eyüp%' OR name ILIKE 'eyup%' LIMIT 1`,
    [],
  );
  const eyupId = eyResult.rows[0]?.id || null;

  const pharmacies = [
    // Haliliye merkez eczaneleri
    { name: 'Güven Eczanesi', address: 'Yenişehir Mah. Sarayönü Cad. No:12, Haliliye', phone: '0414 315 12 45', district_id: haliliyeId },
    { name: 'Topçu Eczanesi', address: 'Topçu Meydanı Karşısı, Haliliye', phone: '0414 316 23 67', district_id: haliliyeId },
    { name: 'Balıklıgöl Eczanesi', address: 'Balıklıgöl Mah. Divan Cad. No:5, Haliliye', phone: '0414 313 44 89', district_id: haliliyeId },
    { name: 'Merkez Eczanesi', address: 'Sarayönü Cad. No:78, Haliliye', phone: '0414 314 56 12', district_id: haliliyeId },
    { name: 'Urfa Eczanesi', address: 'Köprübaşı Mah. No:34, Haliliye', phone: '0414 315 78 23', district_id: haliliyeId },
    { name: 'Sağlık Eczanesi', address: 'Devlet Hastanesi Karşısı, Haliliye', phone: '0414 317 34 56', district_id: haliliyeId },
    { name: 'Hayat Eczanesi', address: 'Yenişehir Mah. No:102, Haliliye', phone: '0414 318 90 12', district_id: haliliyeId },
    // Karaköprü
    { name: 'Karaköprü Eczanesi', address: 'Karaköprü Mah. Merkez Cad. No:15, Karaköprü', phone: '0414 381 23 45', district_id: karakopruId },
    { name: 'Şifa Eczanesi', address: 'Karaköprü Devlet Hastanesi Yanı, Karaköprü', phone: '0414 382 34 56', district_id: karakopruId },
    { name: 'Yeşilay Eczanesi', address: 'Pınarbaşı Mah. No:67, Karaköprü', phone: '0414 383 45 67', district_id: karakopruId },
    // Eyyübiye
    { name: 'Eyyübiye Eczanesi', address: 'Eyyübiye Mah. No:22, Eyyübiye', phone: '0414 321 11 22', district_id: eyupId },
    { name: 'Aksoy Eczanesi', address: 'Mehmet Akif İnan Cad. No:45, Eyyübiye', phone: '0414 322 33 44', district_id: eyupId },
    { name: 'Özen Eczanesi', address: 'GAP Çarşısı Yanı, Eyyübiye', phone: '0414 323 55 66', district_id: eyupId },
  ];

  for (const p of pharmacies) {
    // Daha önce eklenmemişse ekle
    const existing = await query(
      `SELECT id FROM pharmacies WHERE name = $1 AND address = $2`,
      [p.name, p.address],
    );
    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO pharmacies (name, address, phone, district_id, is_on_duty, created_at, updated_at)
         VALUES ($1, $2, $3, $4, false, NOW(), NOW())`,
        [p.name, p.address, p.phone, p.district_id],
      );
    }
  }
}

export async function down() {
  await query(
    `DELETE FROM pharmacies WHERE name IN (
      'Güven Eczanesi','Topçu Eczanesi','Balıklıgöl Eczanesi','Merkez Eczanesi','Urfa Eczanesi',
      'Sağlık Eczanesi','Hayat Eczanesi','Karaköprü Eczanesi','Şifa Eczanesi','Yeşilay Eczanesi',
      'Eyyübiye Eczanesi','Aksoy Eczanesi','Özen Eczanesi'
    )`,
    [],
  );
}
