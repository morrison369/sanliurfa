/**
 * Phase 21: Content Management System
 * CRUD, versioning, publishing workflow, scheduling, media library
 */

export interface ContentItem {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: 'draft' | 'published' | 'archived';
  author: string;
  createdAt: number;
  updatedAt: number;
  publishedAt?: number;
  scheduledFor?: number;
}

export interface ContentVersion {
  versionId: string;
  itemId: string;
  content: string;
  author: string;
  changeNote: string;
  createdAt: number;
}

/**
 * Content Management System
 */
export class ContentManager {
  private items = new Map<string, ContentItem>();
  private versions = new Map<string, ContentVersion[]>();

  /**
   * Create content
   */
  create(title: string, content: string, author: string): ContentItem {
    const id = `content-${Date.now()}`;
    const slug = title.toLowerCase().replace(/\s+/g, '-');

    const item: ContentItem = {
      id,
      title,
      slug,
      content,
      status: 'draft',
      author,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.items.set(id, item);
    this.versions.set(id, []);

    return item;
  }

  /**
   * Update content
   */
  update(id: string, updates: Partial<ContentItem>, changeNote: string): ContentItem | null {
    const item = this.items.get(id);
    if (!item) return null;

    // Save version
    this.versions.get(id)!.push({
      versionId: `v-${Date.now()}`,
      itemId: id,
      content: item.content,
      author: item.author,
      changeNote,
      createdAt: Date.now()
    });

    // Apply updates
    const updated = {...item, ...updates, updatedAt: Date.now()};
    this.items.set(id, updated);

    return updated;
  }

  /**
   * Publish content
   */
  publish(id: string): ContentItem | null {
    const item = this.items.get(id);
    if (!item) return null;

    item.status = 'published';
    item.publishedAt = Date.now();
    this.items.set(id, item);

    return item;
  }

  /**
   * Schedule publishing
   */
  schedule(id: string, publishAt: number): ContentItem | null {
    const item = this.items.get(id);
    if (!item) return null;

    item.scheduledFor = publishAt;
    this.items.set(id, item);

    return item;
  }

  /**
   * Get content by ID
   */
  getById(id: string): ContentItem | null {
    return this.items.get(id) || null;
  }

  /**
   * Get content by slug
   */
  getBySlug(slug: string): ContentItem | null {
    for (const item of this.items.values()) {
      if (item.slug === slug) return item;
    }
    return null;
  }

  /**
   * Get version history
   */
  getHistory(id: string): ContentVersion[] {
    return this.versions.get(id) || [];
  }

  /**
   * Restore from version
   */
  restoreVersion(id: string, versionId: string): ContentItem | null {
    const versions = this.versions.get(id);
    const version = versions?.find(v => v.versionId === versionId);

    if (!version) return null;

    return this.update(id, {content: version.content}, `Restored from ${versionId}`);
  }
}

export const contentManager = new ContentManager();
