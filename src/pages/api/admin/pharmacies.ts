import type { APIRoute } from 'astro';
import { query, queryMany, insert } from '../../../lib/postgres';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isAdmin(locals: any) {
  return Boolean(locals?.isAdmin || locals?.user?.role === 'admin');
}

// GET: nöbetçi eczaneleri listele veya tümünü getir
export const GET: APIRoute = async ({ url, locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);

  const mode = url.searchParams.get('mode') || 'duty';
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

  try {
    if (mode === 'all') {
      const rows = await queryMany(
        `SELECT p.*, d.name as district_name
         FROM pharmacies p
         LEFT JOIN districts d ON p.district_id = d.id
         ORDER BY d.name, p.name`,
        [],
      );
      return json({ success: true, pharmacies: rows });
    }

    const rows = await queryMany(
      `SELECT p.*, d.name as district_name
       FROM pharmacies p
       LEFT JOIN districts d ON p.district_id = d.id
       WHERE p.is_on_duty = true AND (p.duty_date = $1 OR p.duty_date IS NULL)
       ORDER BY d.name, p.name`,
      [date],
    );
    return json({ success: true, date, pharmacies: rows });
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
};

// POST: yeni eczane ekle veya nöbet güncelle
export const POST: APIRoute = async ({ request, locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);

  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'Geçersiz JSON' }, 400); }

  const { action } = body;

  try {
    if (action === 'set_duty') {
      // Bugün için nöbetçi eczaneleri güncelle
      const { pharmacyIds, date } = body as { pharmacyIds: number[]; date: string };
      if (!date || !Array.isArray(pharmacyIds)) return json({ error: 'date ve pharmacyIds zorunlu' }, 400);

      // Önce hepsini nöbetsiz yap
      await query(`UPDATE pharmacies SET is_on_duty = false, duty_date = NULL WHERE duty_date = $1`, [date]);
      // Seçilenleri nöbetçi yap
      if (pharmacyIds.length > 0) {
        await query(
          `UPDATE pharmacies SET is_on_duty = true, duty_date = $1 WHERE id = ANY($2::int[])`,
          [date, pharmacyIds],
        );
      }
      return json({ success: true, message: `${pharmacyIds.length} eczane nöbetçi olarak işaretlendi` });
    }

    if (action === 'add') {
      const { name, address, phone, district_id } = body;
      if (!name || !address) return json({ error: 'name ve address zorunlu' }, 400);
      const row = await insert('pharmacies', { name, address, phone: phone || null, district_id: district_id || null });
      return json({ success: true, pharmacy: row });
    }

    return json({ error: `Bilinmeyen action: ${action}` }, 400);
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
};
