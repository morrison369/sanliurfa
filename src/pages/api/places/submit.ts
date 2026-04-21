// API: Public place submission (PostgreSQL)
import type { APIRoute } from 'astro';
import { insert } from '../../../lib/postgres';
import { sendEmail } from '../../../lib/email';

const SITE_URL = process.env.SITE_URL || 'https://sanliurfa.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@sanliurfa.com';

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

    await sendPlaceSubmissionNotification({
      placeId: place?.id,
      name,
      category,
      address,
      phone,
      submitterName,
      submitterEmail,
    });

    // TODO: Handle image upload

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
}): Promise<void> {
  const adminUrl = `${SITE_URL}/admin/places${input.placeId ? `?q=${encodeURIComponent(input.name)}` : ''}`;
  const html = `
    <h1>Yeni mekan başvurusu</h1>
    <p><strong>Mekan:</strong> ${escapeHtml(input.name)}</p>
    <p><strong>Kategori:</strong> ${escapeHtml(input.category)}</p>
    <p><strong>Adres:</strong> ${escapeHtml(input.address)}</p>
    <p><strong>Telefon:</strong> ${escapeHtml(input.phone)}</p>
    <p><strong>Başvuran:</strong> ${escapeHtml(input.submitterName)} (${escapeHtml(input.submitterEmail)})</p>
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
