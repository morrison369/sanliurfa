/**
 * Bulk Import API
 * CSV/Excel import for places
 */

import type { APIRoute } from 'astro';
import { requireRole } from '../../../lib/auth';
import { createPlace } from '../../../lib/places/db';

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const categoryId = formData.get('categoryId') as string;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'Dosya gerekli' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const content = await file.text();
    const lines = content.split('\n').filter(line => line.trim());
    
    // Skip header
    const dataLines = lines.slice(1);
    
    const results = {
      total: dataLines.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < dataLines.length; i++) {
      try {
        const line = dataLines[i];
        const columns = line.split(',').map(col => col.trim().replace(/^"|"$/g, ''));
        
        // Expected format: name, address, phone, description, lat, lon
        const [name, address, phone, description, lat, lon] = columns;
        
        if (!name) {
          results.failed++;
          results.errors.push(`Satır ${i + 2}: İsim gerekli`);
          continue;
        }

        const slug = name
          .toLowerCase()
          .replace(/ğ/g, 'g')
          .replace(/ü/g, 'u')
          .replace(/ş/g, 's')
          .replace(/ı/g, 'i')
          .replace(/ö/g, 'o')
          .replace(/ç/g, 'c')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        await createPlace({
          slug,
          name,
          category_id: categoryId,
          short_description: description?.slice(0, 200) || '',
          description: description || '',
          address,
          phone,
          latitude: lat ? parseFloat(lat) : undefined,
          longitude: lon ? parseFloat(lon) : undefined,
          status: 'approved',
        });

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Satır ${i + 2}: ${error instanceof Error ? error.message : 'Hata'}`);
      }
    }

    return new Response(
      JSON.stringify(results),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'İmport başarısız' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
