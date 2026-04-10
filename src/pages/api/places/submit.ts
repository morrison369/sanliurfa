// API: Public place submission (PostgreSQL)
import type { APIRoute } from 'astro';
import { getWelcomeEmailHTML, sendEmail } from '../../../lib/email';
import { saveFile } from '../../../lib/file-storage';
import { logger } from '../../../lib/logging';
import { insert, queryOne } from '../../../lib/postgres';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function buildPlaceSubmissionEmailHtml(data: {
  name: string;
  category: string;
  address: string;
  phone: string;
  website?: string;
  submitterName: string;
  submitterEmail: string;
  description: string;
  imageUrl?: string;
}): string {
  return `
    <h1>Yeni mekan başvurusu</h1>
    <p><strong>Mekan:</strong> ${data.name}</p>
    <p><strong>Kategori:</strong> ${data.category}</p>
    <p><strong>Adres:</strong> ${data.address}</p>
    <p><strong>Telefon:</strong> ${data.phone}</p>
    <p><strong>Gönderen:</strong> ${data.submitterName} (${data.submitterEmail})</p>
    ${data.website ? `<p><strong>Web sitesi:</strong> ${data.website}</p>` : ''}
    ${data.imageUrl ? `<p><strong>Fotoğraf:</strong> <a href="${data.imageUrl}">${data.imageUrl}</a></p>` : ''}
    <p><strong>Açıklama:</strong></p>
    <p>${data.description}</p>
  `;
}

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

    const baseSlug = slugify(name);
    const slugConflict = await queryOne('SELECT id FROM places WHERE slug = $1', [baseSlug]);
    const slug = slugConflict ? `${baseSlug}-${Date.now().toString().slice(-6)}` : baseSlug;
    let uploadedImageUrl: string | null = null;

    if (image instanceof File && image.size > 0) {
      if (!image.type.startsWith('image/')) {
        return redirect('/places/ekle?error=invalid_image');
      }

      if (image.size > MAX_IMAGE_SIZE_BYTES) {
        return redirect('/places/ekle?error=image_too_large');
      }

      const uploadedImage = await saveFile(image, 'place-submissions', `${slug}-${image.name}`);
      uploadedImageUrl = uploadedImage.publicUrl;
    }

    // Insert place with pending status
    await insert('places', {
      slug,
      name,
      category,
      address,
      phone,
      description,
      opening_hours: openingHours ? { general: openingHours } : null,
      website: website || null,
      images: uploadedImageUrl ? [uploadedImageUrl] : [],
      cover_image: uploadedImageUrl,
      status: 'pending',
      submitter_name: submitterName,
      submitter_email: submitterEmail,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const adminEmail = process.env.ADMIN_EMAIL || process.env.MAIL_FROM || '';
    if (adminEmail) {
      const adminEmailSent = await sendEmail({
        to: adminEmail,
        subject: `Yeni mekan başvurusu: ${name}`,
        html: buildPlaceSubmissionEmailHtml({
          name,
          category,
          address,
          phone,
          website: website || undefined,
          submitterName,
          submitterEmail,
          description,
          imageUrl: uploadedImageUrl || undefined
        })
      });

      if (!adminEmailSent) {
        logger.warn('Place submission admin email could not be sent', { name, submitterEmail });
      }
    } else {
      logger.warn('ADMIN_EMAIL or MAIL_FROM not configured for place submission notifications', { slug });
    }

    const acknowledgementSent = await sendEmail({
      to: submitterEmail,
      subject: 'Mekan başvurunuz alındı',
      html: getWelcomeEmailHTML(submitterName)
    });

    if (!acknowledgementSent) {
      logger.warn('Place submission acknowledgement email could not be sent', { submitterEmail, slug });
    }

    return redirect('/places/ekle?success=true');
  } catch (err) {
    console.error('Place submission error:', err);
    return redirect('/places/ekle?error=server_error');
  }
};
