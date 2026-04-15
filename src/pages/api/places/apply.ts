import type { APIRoute } from 'astro';
import { query, transaction } from '../../../lib/postgres';
import { logger } from '../../../lib/logging';

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json();
    const {
      // Isletme bilgileri
      name,
      category, category_id,           // eski ve yeni ad
      district_id,                      // yeni alan
      description, short_description,   // eski ve yeni ad
      address,
      phone,
      email,
      website,

      // Sahip bilgileri
      ownerName, owner_name,            // eski ve yeni ad
      ownerEmail, owner_email,          // eski ve yeni ad
      ownerPhone,

      // Ek bilgiler
      hasMenu,
      acceptsReservations,
      openingHours,
      priceRange,
      features
    } = body;

    // Eski ve yeni alan adlarini birlestir
    // category_id integer FK; eski formdan gelen category text ise NULL bırak
    const categoryIdFinal = category_id ? parseInt(String(category_id), 10) : null;
    const categoryFinal = categoryIdFinal || category; // validasyon için
    const ownerNameFinal = owner_name || ownerName;
    const ownerEmailFinal = owner_email || ownerEmail;
    const descriptionFinal = short_description || description;

    // Validasyon
    if (!name || !categoryFinal || !address || !phone || !ownerNameFinal || !ownerEmailFinal) {
      return new Response(JSON.stringify({
        error: 'Zorunlu alanlar eksik',
        fields: ['name', 'category_id', 'address', 'phone', 'owner_name', 'owner_email']
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Email validasyonu
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(ownerEmailFinal)) {
      return new Response(JSON.stringify({ error: 'Geçersiz e-posta adresi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Telefon validasyonu
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
      return new Response(JSON.stringify({ error: 'Geçersiz telefon numarası' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Slug olustur
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);

    // Slug kontrolu
    const slugCheck = await query('SELECT id FROM places WHERE slug = $1', [slug]);
    let finalSlug = slug;
    if (slugCheck.rows.length > 0) {
      finalSlug = `${slug}-${Date.now().toString(36).substr(-4)}`;
    }

    // Transaction ile kullanici ve isletme olustur
    const result = await transaction(async (client) => {
      // 1. Kullanici olustur (veya varsa al)
      let userId;
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [ownerEmailFinal]
      );

      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].id;
        // Rolunu vendor yap
        await client.query(
          "UPDATE users SET role = 'vendor', updated_at = NOW() WHERE id = $1",
          [userId]
        );
      } else {
        const newUser = await client.query(
          `INSERT INTO users (name, email, phone, role, status, email_verified)
           VALUES ($1, $2, $3, 'vendor', 'active', false)
           RETURNING id`,
          [ownerNameFinal, ownerEmailFinal, ownerPhone || null]
        );
        userId = newUser.rows[0].id;
      }

      // 2. Isletme olustur
      const placeResult = await client.query(
        `INSERT INTO places (
          name, slug, category_id, short_description, address, phone, email, website,
          district_id, owner_id, status, price_range, accepts_reservations,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11, $12, NOW(), NOW())
        RETURNING id, slug`,
        [
          name, finalSlug, categoryIdFinal, descriptionFinal || null, address,
          phone.replace(/\D/g, ''), email || null, website || null,
          district_id || null, userId, priceRange || null, acceptsReservations || false
        ]
      );

      const placeId = placeResult.rows[0].id;

      // 3. Calisma saatlerini ekle
      if (openingHours && Object.keys(openingHours).length > 0) {
        for (const [day, hours] of Object.entries(openingHours)) {
          if (hours.open && hours.close) {
            await client.query(
              `INSERT INTO place_hours (place_id, day_of_week, open_time, close_time, is_closed)
               VALUES ($1, $2, $3, $4, $5)`,
              [placeId, parseInt(day), hours.open, hours.close, hours.closed || false]
            );
          }
        }
      }

      // 4. Ozellikleri ekle
      if (features && features.length > 0) {
        for (const feature of features) {
          await client.query(
            'INSERT INTO place_features (place_id, feature) VALUES ($1, $2)',
            [placeId, feature]
          );
        }
      }

      // 5. Ticket olustur (admin bildirimi icin)
      await client.query(
        `INSERT INTO support_tickets (name, email, subject, message, type, place_id, status, priority)
         VALUES ($1, $2, $3, $4, 'business_inquiry', $5, 'open', 'high')`,
        [
          ownerNameFinal, ownerEmailFinal, 'Yeni İşletme Başvurusu',
          `${name} isimli işletme başvurusu yapıldı. Onay bekliyor.`,
          placeId
        ]
      );

      return placeResult.rows[0];
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Basvurunuz alindi! En kisa surede degerlendirilecek.',
      place: {
        id: result.id,
        slug: result.slug,
        status: 'pending'
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Place application error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
