import { apiError, ErrorCode } from './api';
import { saveFile, validateImageSignature } from './file/file-storage';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const MAX_CLASSIFIED_IMAGES = 10;
const MAX_CLASSIFIED_IMAGE_SIZE = 8 * 1024 * 1024;

export function parseClassifiedImagePaths(form: FormData): string[] {
  return String(form.get('images') || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function saveClassifiedImagesFromForm(form: FormData): Promise<string[] | Response> {
  const files = form
    .getAll('photos')
    .filter((item): item is File => item instanceof File && item.size > 0);

  if (files.length > MAX_CLASSIFIED_IMAGES) {
    return apiError(ErrorCode.VALIDATION_ERROR, `En fazla ${MAX_CLASSIFIED_IMAGES} ilan görseli yüklenebilir`, 400);
  }

  const savedPaths: string[] = [];
  for (const file of files) {
    if (file.size > MAX_CLASSIFIED_IMAGE_SIZE) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Her ilan görseli en fazla 8MB olabilir', 400);
    }

    const mimeType = file.type.toLowerCase();
    const ext = MIME_TO_EXT[mimeType];
    if (!ext) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Sadece JPEG, PNG, WebP ve GIF ilan görseli desteklenir', 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateImageSignature(buffer, mimeType)) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz ilan görseli', 400);
    }

    const saved = await saveFile(
      new File([buffer], `classified.${ext}`, { type: mimeType }),
      'classifieds',
      undefined,
      buffer,
    );
    savedPaths.push(saved.filePath);
  }

  return savedPaths;
}
