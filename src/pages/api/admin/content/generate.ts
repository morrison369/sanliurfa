import type { APIRoute } from 'astro';
import { apiResponse, apiError, safeErrorDetail } from '../../../../lib/api';
import {
  generatePlaceDescription,
  generateBlogContent,
  generateBlogContentHTML,
  generateCategoryDescription,
  generateFAQItems,
  generateDistrictGuide,
  generateSeoMetaDescription,
  ollamaChat,
} from '../../../../lib/ai/ollama';

const ALLOWED_TYPES = new Set([
  'place_description',
  'blog_content',
  'blog_content_html',
  'category_description',
  'faq_items',
  'district_guide',
  'meta_description',
  'custom',
]);

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return apiError('UNAUTHORIZED', 'Yetki gerekli', 403);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_INPUT', 'Geçersiz JSON', 400);
  }

  const { type, params = {}, prompt } = body;

  if (!type || !ALLOWED_TYPES.has(type)) {
    return apiError('INVALID_INPUT', `Geçersiz tip. Geçerli: ${[...ALLOWED_TYPES].join(', ')}`, 422);
  }

  try {
    let result: string | Array<{ q: string; a: string }>;

    switch (type) {
      case 'place_description':
        result = await generatePlaceDescription(
          params.name || 'Mekan',
          params.category || 'İşletme',
          params.district || 'Şanlıurfa'
        );
        break;

      case 'blog_content':
        result = await generateBlogContent(
          params.title || 'Blog Başlığı',
          params.keywords || [],
          params.wordCount || 600
        );
        break;

      case 'blog_content_html':
        result = await generateBlogContentHTML(
          params.title || 'Blog Başlığı',
          params.keywords || [],
          params.wordCount || 600
        );
        break;

      case 'category_description':
        result = await generateCategoryDescription(
          params.categoryName || 'Kategori',
          params.parentCategory
        );
        break;

      case 'faq_items':
        result = await generateFAQItems(params.topic || 'Şanlıurfa', params.count || 5);
        break;

      case 'district_guide':
        result = await generateDistrictGuide(
          params.district || 'Eyyübiye',
          params.highlights || []
        );
        break;

      case 'meta_description':
        result = await generateSeoMetaDescription(
          params.pageTitle || '',
          params.pageType || 'sayfa'
        );
        break;

      case 'custom':
        if (!prompt) return apiError('INVALID_INPUT', 'custom tip için prompt gerekli', 422);
        const chatResult = await ollamaChat(
          [
            {
              role: 'system',
              content:
                'Sen Şanlıurfa.com için çalışan profesyonel bir Türkçe içerik yazarısın. Sadece Türkçe yaz.',
            },
            { role: 'user', content: prompt },
          ],
          { model: params.model }
        );
        result = chatResult.content;
        break;

      default:
        return apiError('INVALID_INPUT', 'Bilinmeyen tip', 422);
    }

    return apiResponse({ type, result, model: import.meta.env.OLLAMA_MODEL || 'gemma4:31b' });
  } catch (err) {
    return apiError(
      'GENERATION_ERROR',
      safeErrorDetail(err, 'İçerik üretimi sırasında hata oluştu'),
      500
    );
  }
};
