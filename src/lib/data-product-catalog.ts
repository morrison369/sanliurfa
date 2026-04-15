/**
 * Phase 180: Data Product Catalog
 * Data product registry, versioning, discovery, rating
 */

import { logger } from './logger';

interface DataProduct {
  productId: string;
  name: string;
  description: string;
  domainId: string;
  owner: string;
  schema: Record<string, string>;
  outputPort: { type: 'api' | 'file' | 'stream' | 'table'; endpoint: string };
  sla: { freshnessHours: number; availabilityPct: number };
  tags: string[];
  version: string;
  createdAt: number;
  status: 'draft' | 'published' | 'deprecated';
}

interface DataProductVersion {
  versionId: string;
  productId: string;
  version: string;
  changelog: string;
  schema: Record<string, string>;
  publishedAt: number;
  deprecated: boolean;
}

interface DataProductRating {
  ratingId: string;
  productId: string;
  userId: string;
  score: number;
  comment: string;
  createdAt: number;
}

class DataProductRegistry {
  private products: Map<string, DataProduct> = new Map();
  private counter = 0;

  register(name: string, domainId: string, owner: string, schema: Record<string, string>, outputPort: DataProduct['outputPort'], sla: DataProduct['sla'], tags: string[] = []): DataProduct {
    const productId = `dp-${Date.now()}-${++this.counter}`;
    const product: DataProduct = {
      productId, name, description: `Data product: ${name}`,
      domainId, owner, schema, outputPort, sla, tags,
      version: '1.0.0', createdAt: Date.now(), status: 'draft'
    };
    this.products.set(productId, product);
    logger.debug('Data product registered', { productId, name, domainId });
    return product;
  }

  publish(productId: string): DataProduct | undefined {
    const product = this.products.get(productId);
    if (product) {
      product.status = 'published';
      logger.debug('Data product published', { productId, name: product.name });
      return product;
    }
    return undefined;
  }

  deprecate(productId: string): DataProduct | undefined {
    const product = this.products.get(productId);
    if (product) { product.status = 'deprecated'; return product; }
    return undefined;
  }

  getProduct(productId: string): DataProduct | undefined {
    return this.products.get(productId);
  }

  getByDomain(domainId: string): DataProduct[] {
    return Array.from(this.products.values()).filter(p => p.domainId === domainId);
  }

  getPublished(): DataProduct[] {
    return Array.from(this.products.values()).filter(p => p.status === 'published');
  }
}

class DataProductVersionManager {
  private versions: Map<string, DataProductVersion[]> = new Map();
  private counter = 0;

  createVersion(productId: string, version: string, changelog: string, schema: Record<string, string>): DataProductVersion {
    const versionId = `dpv-${Date.now()}-${++this.counter}`;
    const v: DataProductVersion = { versionId, productId, version, changelog, schema, publishedAt: Date.now(), deprecated: false };
    const existing = this.versions.get(productId) || [];
    existing.push(v);
    this.versions.set(productId, existing);
    logger.debug('Data product version created', { versionId, productId, version });
    return v;
  }

  getVersion(productId: string, version: string): DataProductVersion | undefined {
    return this.versions.get(productId)?.find(v => v.version === version);
  }

  getLatestVersion(productId: string): DataProductVersion | undefined {
    const history = this.versions.get(productId) || [];
    return history.filter(v => !v.deprecated).pop();
  }

  getVersionHistory(productId: string): DataProductVersion[] {
    return this.versions.get(productId) || [];
  }

  deprecateVersion(productId: string, version: string): boolean {
    const v = this.getVersion(productId, version);
    if (v) { v.deprecated = true; return true; }
    return false;
  }
}

class DataProductDiscovery {
  search(products: DataProduct[], query: string): DataProduct[] {
    const q = query.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  filterByDomain(products: DataProduct[], domainId: string): DataProduct[] {
    return products.filter(p => p.domainId === domainId);
  }

  filterByTag(products: DataProduct[], tag: string): DataProduct[] {
    return products.filter(p => p.tags.includes(tag));
  }

  filterByOutputType(products: DataProduct[], type: string): DataProduct[] {
    return products.filter(p => p.outputPort.type === type);
  }

  getRecommendations(consumedProducts: DataProduct[], allProducts: DataProduct[]): DataProduct[] {
    const consumedDomains = new Set(consumedProducts.map(p => p.domainId));
    const consumedIds = new Set(consumedProducts.map(p => p.productId));

    return allProducts
      .filter(p => !consumedIds.has(p.productId) && consumedDomains.has(p.domainId) && p.status === 'published')
      .slice(0, 5);
  }
}

class DataProductRatingSystem {
  private ratings: Map<string, DataProductRating[]> = new Map();
  private counter = 0;

  rate(productId: string, userId: string, score: number, comment: string): DataProductRating {
    const ratingId = `rating-${Date.now()}-${++this.counter}`;
    const rating: DataProductRating = {
      ratingId, productId, userId,
      score: Math.max(1, Math.min(5, score)),
      comment, createdAt: Date.now()
    };
    const existing = this.ratings.get(productId) || [];
    // Upsert: update if user already rated
    const idx = existing.findIndex(r => r.userId === userId);
    if (idx >= 0) existing[idx] = rating; else existing.push(rating);
    this.ratings.set(productId, existing);
    logger.debug('Data product rated', { productId, userId, score });
    return rating;
  }

  getAverageRating(productId: string): { score: number; count: number } {
    const ratings = this.ratings.get(productId) || [];
    if (!ratings.length) return { score: 0, count: 0 };
    return {
      score: ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length,
      count: ratings.length
    };
  }

  getTopRated(allProducts: DataProduct[], limit: number): Array<DataProduct & { avgScore: number }> {
    return allProducts
      .map(p => ({ ...p, avgScore: this.getAverageRating(p.productId).score }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, limit);
  }

  getProductRatings(productId: string): DataProductRating[] {
    return this.ratings.get(productId) || [];
  }
}

export const dataProductRegistry = new DataProductRegistry();
export const dataProductVersionManager = new DataProductVersionManager();
export const dataProductDiscovery = new DataProductDiscovery();
export const dataProductRatingSystem = new DataProductRatingSystem();

export { DataProduct, DataProductVersion, DataProductRating };
