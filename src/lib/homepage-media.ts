import { resolveContentImage } from './content-images';
import {
  getHomepageCuratedImage,
  pickHomepageFallbackImage,
  type HomepageImageCategory,
} from '../data/image-map';

const GENERIC_PLACEHOLDERS = new Set([
  '/images/placeholder-place.jpg',
  '/images/placeholder-historical.jpg',
  '/images/placeholder-blog.jpg',
  '/images/placeholder-event.jpg',
  '/images/foods/default.jpg',
]);

function hashSeed(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = ((h << 5) - h + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function createHomepageImageResolver() {
  const usedHomepageImages = new Set<string>();

  function reserveHomepageImage(src: string) {
    usedHomepageImages.add(src);
    return src;
  }

  function resolveHomepageCardImage(input: {
    registryCategory: HomepageImageCategory;
    contentCategory: string;
    slug?: string | undefined;
    explicit?: string | undefined;
    placeholder: string;
    seed: string;
  }) {
    const { registryCategory, contentCategory, slug, explicit, placeholder, seed } = input;
    const curated = getHomepageCuratedImage(registryCategory, slug);
    if (curated && !usedHomepageImages.has(curated)) {
      return reserveHomepageImage(curated);
    }

    const resolved = resolveContentImage({
      category: contentCategory,
      slug,
      explicit,
      placeholder,
      preferLocal: true,
    });

    if (!GENERIC_PLACEHOLDERS.has(resolved) && !usedHomepageImages.has(resolved)) {
      return reserveHomepageImage(resolved);
    }

    return reserveHomepageImage(
      pickHomepageFallbackImage(
        registryCategory,
        hashSeed(seed || slug || placeholder),
        usedHomepageImages,
      ),
    );
  }

  return {
    usedHomepageImages,
    resolveHomepageCardImage,
  };
}
