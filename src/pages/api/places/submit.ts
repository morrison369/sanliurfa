// API: Public place submission (PostgreSQL)
import type { APIRoute } from 'astro';
import { insert, update } from '../../../lib/postgres';
import { sendEmail } from '../../../lib/email';
import { saveFile } from '../../../lib/file-storage';

const SITE_URL = process.env.SITE_URL || 'https://sanliurfa.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@sanliurfa.com';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const formData = await request.formData();

    // Extract form data
    const name = formData.get('name')?.toString();
    const category = formData.get('category')?.toString();
    const address = formData.get('address')?.toString();
    const phone = formData.get('phone')?.toString();
    const description = formData.get('description')?.toString();
    const openingHours = formData.get('opening_hours')?.toString();
    const website = formData.get('website')?.toString();
    const submitterName = formData.get('submitter_name')?.toString();
    const submitterEmail = formData.get('submitter_email')?.toString();
    const image = formData.get('image');

    // Validation
    if (!name || !category || !address || !phone || !description || !submitterName || !submitterEmail) {
      return redirect('/places/ekle?error=missing_fields');
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(submitterEmail)) {
      return redirect('/places/ekle?error=invalid_email');
    }

    const slug = slugifyTurkish(name);
    const imageFile = image instanceof File && image.size > 0 ? image : null;

    if (imageFile && imageFile.size > MAX_IMAGE_SIZE) {
      return redirect('/places/ekle?error=image_too_large');
    }

    if (imageFile && !ALLOWED_IMAGE_TYPES.has(imageFile.type)) {
      return redirect('/places/ekle?error=invalid_image_type');
    }

    // Insert place with pending status
    const place = await insert('places', {
      slug,
      name,
      category,
      address,
      phone,
      description,
      opening_hours: openingHours ? { general: openingHours } : null,
      website,
      status: 'pending',
      submitter_name: submitterName,
      submitter_email: submitterEmail,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    let imagePath: string | null = null;
    if (place?.id && imageFile) {
      const savedImage = await saveFile(imageFile, place.id, slug);
      imagePath = savedImage.filePath;
      await update('places', place.id, {
        image_url: imagePath,
        images: [imagePath],
        updated_at: new Date().toISOString(),
      });
    }

    await sendPlaceSubmissionNotification({
      placeId: place?.id,
      name,
      category,
      address,
      phone,
      submitterName,
      submitterEmail,
      imagePath,
    });

    return redirect('/places/ekle?success=true');
  } catch (err) {
    console.error('Place submission error:', err);
    return redirect('/places/ekle?error=server_error');
  }
};

function slugifyTurkish(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function sendPlaceSubmissionNotification(input: {
  placeId?: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  submitterName: string;
  submitterEmail: string;
  imagePath?: string | null;
}): Promise<void> {
  const adminUrl = `${SITE_URL}/admin/places${input.placeId ? `?q=${encodeURIComponent(input.name)}` : ''}`;
  const html = `
    <h1>Yeni mekan başvurusu</h1>
    <p><strong>Mekan:</strong> ${escapeHtml(input.name)}</p>
    <p><strong>Kategori:</strong> ${escapeHtml(input.category)}</p>
    <p><strong>Adres:</strong> ${escapeHtml(input.address)}</p>
    <p><strong>Telefon:</strong> ${escapeHtml(input.phone)}</p>
    <p><strong>Başvuran:</strong> ${escapeHtml(input.submitterName)} (${escapeHtml(input.submitterEmail)})</p>
    ${input.imagePath ? `<p><strong>Fotoğraf:</strong> <a href="${SITE_URL}${escapeHtml(input.imagePath)}">${escapeHtml(input.imagePath)}</a></p>` : ''}
    <p><a href="${adminUrl}">Admin panelinde incele</a></p>
  `;

  try {
    await sendEmail(ADMIN_EMAIL, `Yeni mekan başvurusu: ${input.name}`, html);
  } catch (error) {
    console.error('Place submission admin email error:', error);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return entities[char];
  });
}
