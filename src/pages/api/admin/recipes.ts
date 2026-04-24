import type { APIRoute } from 'astro';
import { query, queryOne } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';

function adminGuard(locals: App.Locals, requestId: string) {
  if (!locals.user || !locals.isAdmin) {
    return apiError(ErrorCode.FORBIDDEN, 'Yetkisiz erişim', HttpStatus.FORBIDDEN, undefined, requestId);
  }
  return null;
}

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId(request);
  const guard = adminGuard(locals, requestId);
  if (guard) return guard;

  try {
    const slug = url.searchParams.get('slug');

    if (slug) {
      const recipe = await queryOne(`SELECT * FROM recipes WHERE slug = $1`, [slug]);
      return apiResponse(recipe, HttpStatus.OK, requestId);
    }

    const result = await query(
      `SELECT id, slug, name, description, difficulty, prep_time, cook_time,
              servings, is_spicy, is_vegetarian, is_featured, rating, view_count,
              status, cover_image, created_at, updated_at
       FROM recipes
       ORDER BY is_featured DESC, created_at DESC`,
      []
    );
    return apiResponse({ recipes: result.rows, total: result.rows.length }, HttpStatus.OK, requestId);
  } catch (e: any) {
    return apiError(ErrorCode.INTERNAL_ERROR, e.message, HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const guard = adminGuard(locals, requestId);
  if (guard) return guard;

  try {
    const body = await request.json();
    const { action, id, slug } = body;

    if (action === 'toggle_featured') {
      const recipe = await queryOne(`SELECT id, is_featured FROM recipes WHERE id = $1`, [id]);
      if (!recipe) return apiError(ErrorCode.NOT_FOUND, 'Tarif bulunamadı', HttpStatus.NOT_FOUND, undefined, requestId);
      await query(`UPDATE recipes SET is_featured = $1, updated_at = NOW() WHERE id = $2`, [!recipe.is_featured, id]);
      return apiResponse({ success: true }, HttpStatus.OK, requestId);
    }

    if (action === 'toggle_status') {
      const recipe = await queryOne(`SELECT id, status FROM recipes WHERE id = $1`, [id]);
      if (!recipe) return apiError(ErrorCode.NOT_FOUND, 'Tarif bulunamadı', HttpStatus.NOT_FOUND, undefined, requestId);
      const newStatus = recipe.status === 'published' ? 'draft' : 'published';
      await query(`UPDATE recipes SET status = $1, updated_at = NOW() WHERE id = $2`, [newStatus, id]);
      return apiResponse({ success: true, status: newStatus }, HttpStatus.OK, requestId);
    }

    if (action === 'delete') {
      await query(`DELETE FROM recipes WHERE id = $1`, [id]);
      return apiResponse({ success: true }, HttpStatus.OK, requestId);
    }

    if (action === 'upsert') {
      const {
        name, description, difficulty = 'Orta', prep_time = 0, cook_time = 0,
        servings = 4, is_spicy = false, is_vegetarian = false, is_featured = false,
        cover_image, ingredients = [], instructions = [],
        meta_title, meta_description, status = 'published',
      } = body;

      if (!name?.trim() || !slug?.trim()) {
        return apiError(ErrorCode.VALIDATION_ERROR, 'Ad ve slug zorunludur', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
      }

      const existing = await queryOne(`SELECT id FROM recipes WHERE slug = $1`, [slug]);

      if (existing) {
        await query(
          `UPDATE recipes SET name=$1, description=$2, difficulty=$3, prep_time=$4, cook_time=$5,
           servings=$6, is_spicy=$7, is_vegetarian=$8, is_featured=$9, cover_image=$10,
           ingredients=$11, instructions=$12, meta_title=$13, meta_description=$14,
           status=$15, updated_at=NOW() WHERE slug=$16`,
          [name, description, difficulty, prep_time, cook_time, servings, is_spicy, is_vegetarian,
           is_featured, cover_image || null, ingredients, instructions, meta_title || null,
           meta_description || null, status, slug]
        );
        return apiResponse({ success: true, action: 'updated', slug }, HttpStatus.OK, requestId);
      } else {
        await query(
          `INSERT INTO recipes (slug, name, description, difficulty, prep_time, cook_time,
           servings, is_spicy, is_vegetarian, is_featured, cover_image, ingredients,
           instructions, meta_title, meta_description, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
          [slug, name, description, difficulty, prep_time, cook_time, servings, is_spicy,
           is_vegetarian, is_featured, cover_image || null, ingredients, instructions,
           meta_title || null, meta_description || null, status]
        );
        return apiResponse({ success: true, action: 'created', slug }, HttpStatus.CREATED, requestId);
      }
    }

    return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz action', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
  } catch (e: any) {
    return apiError(ErrorCode.INTERNAL_ERROR, e.message, HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
