/**
 * Phase 53: Inventory Management & Warehouse Operations
 * Warehouse management, inventory tracking, stock movements, location management
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type WarehouseStatus = 'active' | 'inactive' | 'maintenance';
export type StockMovementType = 'received' | 'picked' | 'packed' | 'shipped' | 'returned' | 'damaged';

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  status: WarehouseStatus;
  capacity: number;
  currentStock: number;
}

export interface InventoryLevel {
  warehouseId: string;
  sku: string;
  quantity: number;
  reserved: number;
  available: number;
  lastUpdated: number;
}

export interface StockMovement {
  id: string;
  warehouseId: string;
  sku: string;
  quantity: number;
  type: StockMovementType;
  timestamp: number;
}

// ==================== WAREHOUSE MANAGER ====================

export class WarehouseManager {
  private warehouses = new Map<string, Warehouse>();
  private warehousesByStatus = new Map<WarehouseStatus, Set<string>>();

  /**
   * Create warehouse
   */
  createWarehouse(warehouse: Omit<Warehouse, 'currentStock'>): Warehouse {
    const fullWarehouse: Warehouse = {
      ...warehouse,
      currentStock: 0
    };

    this.warehouses.set(warehouse.id, fullWarehouse);

    if (!this.warehousesByStatus.has(warehouse.status)) {
      this.warehousesByStatus.set(warehouse.status, new Set());
    }
    this.warehousesByStatus.get(warehouse.status)!.add(warehouse.id);

    logger.debug('Warehouse created', { warehouseId: warehouse.id, location: warehouse.location });

    return fullWarehouse;
  }

  /**
   * Get warehouse by ID
   */
  getWarehouse(warehouseId: string): Warehouse | null {
    return this.warehouses.get(warehouseId) || null;
  }

  /**
   * List warehouses by status
   */
  listWarehouses(status?: WarehouseStatus): Warehouse[] {
    if (!status) {
      return Array.from(this.warehouses.values());
    }

    const warehouseIds = this.warehousesByStatus.get(status) || new Set();
    return Array.from(warehouseIds).map(id => this.warehouses.get(id)!);
  }

  /**
   * Update warehouse capacity
   */
  updateCapacity(warehouseId: string, newCapacity: number): void {
    const warehouse = this.warehouses.get(warehouseId);
    if (warehouse) {
      warehouse.capacity = newCapacity;
      logger.debug('Warehouse capacity updated', { warehouseId, newCapacity });
    }
  }

  /**
   * Get warehouse utilization percentage
   */
  getUtilization(warehouseId: string): number {
    const warehouse = this.warehouses.get(warehouseId);
    if (!warehouse || warehouse.capacity === 0) {
      return 0;
    }

    return Math.round((warehouse.currentStock / warehouse.capacity) * 100);
  }
}

// ==================== INVENTORY OPTIMIZER ====================

export class InventoryOptimizer {
  /**
   * Calculate reorder point (ROP = (Average Daily Usage × Lead Time) + Safety Stock)
   */
  calculateReorderPoint(sku: string, leadTime: number, dailyUsage: number): number {
    const safetyStock = this.calculateSafetyStock(sku, 0.2);
    return Math.ceil(dailyUsage * leadTime + safetyStock);
  }

  /**
   * Calculate safety stock
   */
  calculateSafetyStock(sku: string, variability: number): number {
    return Math.ceil(50 * variability); // Simplified: base 50 units × variability factor
  }

  /**
   * Get optimal stock levels
   */
  getOptimalLevel(sku: string): { min: number; max: number; reorder: number } {
    const reorder = this.calculateReorderPoint(sku, 7, 10);
    const max = reorder * 2;
    const min = this.calculateSafetyStock(sku, 0.2);

    return {
      min: Math.ceil(min),
      max: Math.ceil(max),
      reorder: reorder
    };
  }

  /**
   * Analyze inventory turnover
   */
  analyzeTurnover(sku: string, period: string): { turnover: number; daysInStock: number } {
    const turnover = Math.random() * 10 + 1; // Simulated turnover rate
    const daysInStock = Math.round(365 / turnover);

    return {
      turnover: Math.round(turnover * 100) / 100,
      daysInStock
    };
  }
}

// ==================== WAREHOUSE OPERATIONS ====================

export class WarehouseOperations {
  private movements: StockMovement[] = [];
  private inventoryLevels = new Map<string, InventoryLevel>();

  /**
   * Record stock movement
   */
  recordMovement(movement: StockMovement): void {
    this.movements.push(movement);
    logger.debug('Stock movement recorded', { warehouseId: movement.warehouseId, type: movement.type, sku: movement.sku });
  }

  /**
   * Get movements for warehouse and date range
   */
  getMovements(warehouseId: string, startDate?: number, endDate?: number): StockMovement[] {
    let result = this.movements.filter(m => m.warehouseId === warehouseId);

    if (startDate && endDate) {
      result = result.filter(m => m.timestamp >= startDate && m.timestamp <= endDate);
    }

    return result;
  }

  /**
   * Update inventory level
   */
  updateInventoryLevel(warehouseId: string, sku: string, quantity: number): InventoryLevel {
    const key = `${warehouseId}:${sku}`;
    const level = this.inventoryLevels.get(key) || {
      warehouseId,
      sku,
      quantity: 0,
      reserved: 0,
      available: 0,
      lastUpdated: Date.now()
    };

    level.quantity = quantity;
    level.available = Math.max(0, quantity - level.reserved);
    level.lastUpdated = Date.now();

    this.inventoryLevels.set(key, level);

    logger.debug('Inventory level updated', { warehouseId, sku, quantity });

    return level;
  }

  /**
   * Get inventory level
   */
  getInventoryLevel(warehouseId: string, sku: string): InventoryLevel | null {
    const key = `${warehouseId}:${sku}`;
    return this.inventoryLevels.get(key) || null;
  }
}

// ==================== EXPORTS ====================

export const warehouseManager = new WarehouseManager();
export const inventoryOptimizer = new InventoryOptimizer();
export const warehouseOperations = new WarehouseOperations();
