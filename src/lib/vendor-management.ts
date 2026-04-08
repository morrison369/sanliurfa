/**
 * Phase 47: Vendor Management & Business Profiles
 * Vendor profiles, business verification, inventory management, storefront customization
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type VendorStatus = 'pending' | 'verified' | 'suspended' | 'active';

export interface VendorProfile {
  id: string;
  name: string;
  description: string;
  status: VendorStatus;
  rating: number;
  reviews: number;
  registeredAt: number;
}

export interface StoreSettings {
  vendorId: string;
  customization: Record<string, any>;
  theme: string;
  logo: string;
}

export interface InventoryItem {
  id: string;
  vendorId: string;
  quantity: number;
  sku: string;
  available: boolean;
}

// ==================== VENDOR REGISTRY ====================

export class VendorRegistry {
  private vendors = new Map<string, VendorProfile>();
  private vendorsByStatus = new Map<VendorStatus, Set<string>>();

  /**
   * Register new vendor
   */
  register(vendor: Omit<VendorProfile, 'registeredAt'>): VendorProfile {
    const profile: VendorProfile = {
      ...vendor,
      registeredAt: Date.now()
    };

    this.vendors.set(vendor.id, profile);

    if (!this.vendorsByStatus.has(vendor.status)) {
      this.vendorsByStatus.set(vendor.status, new Set());
    }
    this.vendorsByStatus.get(vendor.status)!.add(vendor.id);

    logger.debug('Vendor registered', { vendorId: vendor.id, status: vendor.status });

    return profile;
  }

  /**
   * Verify vendor after KYC/document check
   */
  verify(vendorId: string): void {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) return;

    const oldStatus = vendor.status;
    vendor.status = 'verified';

    // Update status index
    this.vendorsByStatus.get(oldStatus)?.delete(vendorId);
    if (!this.vendorsByStatus.has('verified')) {
      this.vendorsByStatus.set('verified', new Set());
    }
    this.vendorsByStatus.get('verified')!.add(vendorId);

    logger.info('Vendor verified', { vendorId });
  }

  /**
   * Suspend vendor
   */
  suspend(vendorId: string, reason: string): void {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) return;

    const oldStatus = vendor.status;
    vendor.status = 'suspended';

    this.vendorsByStatus.get(oldStatus)?.delete(vendorId);
    if (!this.vendorsByStatus.has('suspended')) {
      this.vendorsByStatus.set('suspended', new Set());
    }
    this.vendorsByStatus.get('suspended')!.add(vendorId);

    logger.warn('Vendor suspended', { vendorId, reason });
  }

  /**
   * Get vendor by ID
   */
  getVendor(vendorId: string): VendorProfile | null {
    return this.vendors.get(vendorId) || null;
  }

  /**
   * List vendors by status
   */
  listVendors(status?: VendorStatus): VendorProfile[] {
    if (!status) {
      return Array.from(this.vendors.values());
    }

    const vendorIds = this.vendorsByStatus.get(status) || new Set();
    return Array.from(vendorIds).map(id => this.vendors.get(id)!);
  }
}

// ==================== STORE MANAGER ====================

export class StoreManager {
  private settings = new Map<string, StoreSettings>();
  private vendorStats = new Map<string, { totalRevenue: number; orderCount: number; returnRate: number }>();

  /**
   * Update store settings
   */
  updateSettings(vendorId: string, settings: StoreSettings): void {
    this.settings.set(vendorId, settings);
    logger.debug('Store settings updated', { vendorId });
  }

  /**
   * Get store settings
   */
  getSettings(vendorId: string): StoreSettings | null {
    return this.settings.get(vendorId) || null;
  }

  /**
   * Update vendor rating
   */
  updateRating(vendorId: string, newRating: number): void {
    logger.debug('Vendor rating updated', { vendorId, rating: newRating });
  }

  /**
   * Get vendor statistics
   */
  getStats(vendorId: string): { totalRevenue: number; orderCount: number; returnRate: number } {
    return this.vendorStats.get(vendorId) || { totalRevenue: 0, orderCount: 0, returnRate: 0 };
  }

  /**
   * Record sale
   */
  recordSale(vendorId: string, revenue: number): void {
    const stats = this.vendorStats.get(vendorId) || { totalRevenue: 0, orderCount: 0, returnRate: 0 };
    stats.totalRevenue += revenue;
    stats.orderCount++;
    this.vendorStats.set(vendorId, stats);
  }
}

// ==================== INVENTORY MANAGER ====================

export class InventoryManager {
  private inventory = new Map<string, InventoryItem>();
  private vendorInventory = new Map<string, Set<string>>();

  /**
   * Add inventory item
   */
  addItem(item: InventoryItem): void {
    this.inventory.set(item.id, item);

    if (!this.vendorInventory.has(item.vendorId)) {
      this.vendorInventory.set(item.vendorId, new Set());
    }
    this.vendorInventory.get(item.vendorId)!.add(item.id);

    logger.debug('Inventory item added', { itemId: item.id, vendorId: item.vendorId });
  }

  /**
   * Update item quantity
   */
  updateQuantity(itemId: string, quantity: number): void {
    const item = this.inventory.get(itemId);
    if (item) {
      item.quantity = quantity;
      logger.debug('Inventory quantity updated', { itemId, quantity });
    }
  }

  /**
   * Set item availability
   */
  setAvailable(itemId: string, available: boolean): void {
    const item = this.inventory.get(itemId);
    if (item) {
      item.available = available;
      logger.debug('Item availability updated', { itemId, available });
    }
  }

  /**
   * Get vendor inventory
   */
  getInventory(vendorId: string): InventoryItem[] {
    const itemIds = this.vendorInventory.get(vendorId) || new Set();
    return Array.from(itemIds)
      .map(id => this.inventory.get(id)!)
      .filter(item => item);
  }

  /**
   * Get low stock items
   */
  getLowStock(vendorId: string, threshold: number = 10): InventoryItem[] {
    return this.getInventory(vendorId).filter(item => item.quantity <= threshold);
  }
}

// ==================== EXPORTS ====================

export const vendorRegistry = new VendorRegistry();
export const storeManager = new StoreManager();
export const inventoryManager = new InventoryManager();
