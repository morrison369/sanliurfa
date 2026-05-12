/**
 * Unit Tests — vendor/vendor-management.ts singleton class managers (Phase 47)
 *
 * - VendorRegistry (register + verify status transition + suspend + getVendor + listVendors status filter)
 * - StoreManager (updateSettings/getSettings + recordSale aggregator + getStats)
 * - InventoryManager (addItem + updateQuantity + setAvailable + getInventory + getLowStock threshold)
 *
 * Singleton state shared.
 */

import { describe, it, expect } from 'vitest';
import {
  vendorRegistry,
  storeManager,
  inventoryManager,
} from '../vendor/vendor-management';

describe('VendorRegistry', () => {
  it('register — registeredAt eklenir + status indexed', () => {
    const VID = `v-reg-${Date.now()}`;
    const v = vendorRegistry.register({
      id: VID,
      name: 'Test Vendor',
      description: 'desc',
      status: 'pending',
      rating: 0,
      reviews: 0,
    });
    expect(v.registeredAt).toBeGreaterThan(0);
    expect(v.status).toBe('pending');
  });

  it('verify — status pending → verified + index updated', () => {
    const VID = `v-verify-${Date.now()}`;
    vendorRegistry.register({ id: VID, name: 'X', description: '', status: 'pending', rating: 0, reviews: 0 });
    vendorRegistry.verify(VID);
    expect(vendorRegistry.getVendor(VID)?.status).toBe('verified');
    const verifiedList = vendorRegistry.listVendors('verified');
    expect(verifiedList.some((v) => v.id === VID)).toBe(true);
    const pendingList = vendorRegistry.listVendors('pending');
    expect(pendingList.some((v) => v.id === VID)).toBe(false);
  });

  it('verify — bilinmeyen id → no-op', () => {
    expect(() => vendorRegistry.verify('non-existent')).not.toThrow();
  });

  it('suspend — status → suspended + index updated', () => {
    const VID = `v-susp-${Date.now()}`;
    vendorRegistry.register({ id: VID, name: 'X', description: '', status: 'active', rating: 0, reviews: 0 });
    vendorRegistry.suspend(VID, 'fraud');
    expect(vendorRegistry.getVendor(VID)?.status).toBe('suspended');
    const suspendedList = vendorRegistry.listVendors('suspended');
    expect(suspendedList.some((v) => v.id === VID)).toBe(true);
  });

  it('getVendor — bilinmeyen id → null', () => {
    expect(vendorRegistry.getVendor('non-existent')).toBeNull();
  });

  it('listVendors — status verme → tüm vendor', () => {
    const all = vendorRegistry.listVendors();
    expect(Array.isArray(all)).toBe(true);
  });
});

describe('StoreManager', () => {
  it('updateSettings + getSettings — kalıcılık', () => {
    const VID = `s-set-${Date.now()}`;
    storeManager.updateSettings(VID, {
      vendorId: VID,
      customization: { primaryColor: '#000' },
      theme: 'dark',
      logo: '/logo.png',
    });
    const s = storeManager.getSettings(VID);
    expect(s?.theme).toBe('dark');
    expect(s?.customization.primaryColor).toBe('#000');
  });

  it('getSettings — kayıtlı değil → null', () => {
    expect(storeManager.getSettings(`non-existent-${Date.now()}`)).toBeNull();
  });

  it('getStats — ilk çağrı default 0/0/0', () => {
    const VID = `s-stats-${Date.now()}`;
    expect(storeManager.getStats(VID)).toEqual({ totalRevenue: 0, orderCount: 0, returnRate: 0 });
  });

  it('recordSale — totalRevenue + orderCount aggregates', () => {
    const VID = `s-sale-${Date.now()}`;
    storeManager.recordSale(VID, 100);
    storeManager.recordSale(VID, 250);
    const stats = storeManager.getStats(VID);
    expect(stats.totalRevenue).toBe(350);
    expect(stats.orderCount).toBe(2);
  });

  it('updateRating — no-op (logger only, no return)', () => {
    expect(() => storeManager.updateRating(`v-${Date.now()}`, 4.5)).not.toThrow();
  });
});

describe('InventoryManager', () => {
  it('addItem + getInventory — vendor isolation', () => {
    const VID = `inv-vendor-${Date.now()}`;
    inventoryManager.addItem({
      id: `inv-1-${Date.now()}`,
      vendorId: VID,
      quantity: 50,
      sku: 'sku-1',
      available: true,
    });
    const list = inventoryManager.getInventory(VID);
    expect(list).toHaveLength(1);
    expect(list[0].quantity).toBe(50);
  });

  it('updateQuantity — kayıtlı item miktarı değişir', () => {
    const ID = `inv-qty-${Date.now()}`;
    inventoryManager.addItem({ id: ID, vendorId: 'v', quantity: 100, sku: 's', available: true });
    inventoryManager.updateQuantity(ID, 25);
    const list = inventoryManager.getInventory('v');
    const item = list.find((i) => i.id === ID);
    expect(item?.quantity).toBe(25);
  });

  it('setAvailable — false flag set', () => {
    const ID = `inv-avail-${Date.now()}`;
    inventoryManager.addItem({ id: ID, vendorId: 'v-avail', quantity: 10, sku: 's', available: true });
    inventoryManager.setAvailable(ID, false);
    const item = inventoryManager.getInventory('v-avail').find((i) => i.id === ID);
    expect(item?.available).toBe(false);
  });

  it('getInventory — bilinmeyen vendor → []', () => {
    expect(inventoryManager.getInventory(`non-existent-${Date.now()}`)).toEqual([]);
  });

  it('getLowStock — threshold default 10 + filter', () => {
    const VID = `inv-low-${Date.now()}`;
    inventoryManager.addItem({ id: `low-1-${Date.now()}`, vendorId: VID, quantity: 5, sku: 's', available: true });
    inventoryManager.addItem({ id: `low-2-${Date.now()}`, vendorId: VID, quantity: 50, sku: 's', available: true });
    const lowStock = inventoryManager.getLowStock(VID);
    expect(lowStock).toHaveLength(1);
    expect(lowStock[0].quantity).toBe(5);
  });

  it('getLowStock — özel threshold parametresi', () => {
    const VID = `inv-thresh-${Date.now()}`;
    inventoryManager.addItem({ id: `t1-${Date.now()}`, vendorId: VID, quantity: 25, sku: 's', available: true });
    expect(inventoryManager.getLowStock(VID, 50)).toHaveLength(1);
    expect(inventoryManager.getLowStock(VID, 10)).toHaveLength(0);
  });

  it('updateQuantity — bilinmeyen item → no-op', () => {
    expect(() => inventoryManager.updateQuantity('non-existent', 1)).not.toThrow();
  });
});
