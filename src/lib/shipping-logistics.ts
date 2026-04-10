/**
 * Phase 55: Shipping & Logistics Management
 * Carrier integration, rate calculation, shipment tracking, route optimization
 */

import { logger } from './logging';
import { deterministicId, hashString, normalize, pickDeterministic, round } from './deterministic';

export type CarrierType = 'ground' | 'express' | 'overnight' | 'international';
export type ShipmentStatus = 'pending' | 'picked' | 'shipped' | 'in_transit' | 'delivered' | 'failed';

export interface Shipment {
  id: string;
  orderId: string;
  status: ShipmentStatus;
  carrier: string;
  trackingNumber: string;
  estimatedDelivery: number;
  actualDelivery?: number;
}

export interface ShippingRate {
  carrier: string;
  serviceType: CarrierType;
  weight: number;
  distance: number;
  cost: number;
}

export interface CarrierConfig {
  name: string;
  apiKey: string;
  accountId: string;
  enabled: boolean;
}

export interface DeliveryUpdate {
  shipmentId: string;
  status: ShipmentStatus;
  location: string;
  timestamp: number;
  details: string;
}

export class ShippingCarrier {
  private carriers = new Map<string, CarrierConfig>();
  private shipmentCount = 0;

  registerCarrier(config: CarrierConfig): void {
    this.carriers.set(config.name, config);
    logger.debug('Carrier registered', { name: config.name });
  }

  getAvailableServices(origin: string, destination: string, weight: number): ShippingRate[] {
    return Array.from(this.carriers.values())
      .filter(c => c.enabled)
      .map(carrier => {
        const seed = `${carrier.name}|${origin}|${destination}|${weight}`;
        const distance = round(normalize(hashString(`${seed}|distance`), 45, 3000), 2);
        return {
          carrier: carrier.name,
          serviceType: pickDeterministic(['ground', 'express', 'overnight', 'international'] as CarrierType[], seed),
          weight,
          distance,
          cost: this.calculateRate(carrier.name, weight, distance)
        };
      });
  }

  calculateRate(carrier: string, weight: number, distance: number): number {
    const carrierMultiplier = 1 + normalize(hashString(`${carrier}|multiplier`), 0, 0.2);
    const baseRate = 5;
    const weightCost = weight * 0.5;
    const distanceCost = distance * 0.02;
    return round((baseRate + weightCost + distanceCost) * carrierMultiplier, 2);
  }

  createShipment(shipment: Omit<Shipment, 'trackingNumber'>): Shipment {
    const trackingNumber = deterministicId('trk', `${shipment.id}|${shipment.orderId}|${shipment.carrier}`, this.shipmentCount++);
    const fullShipment: Shipment = {
      ...shipment,
      trackingNumber
    };

    logger.debug('Shipment created', { shipmentId: shipment.id, trackingNumber });

    return fullShipment;
  }

  generateLabel(shipmentId: string): string {
    const labelUrl = `/labels/${shipmentId}.pdf`;
    logger.debug('Shipping label generated', { shipmentId, url: labelUrl });
    return labelUrl;
  }
}

export class DeliveryTracker {
  private updates = new Map<string, DeliveryUpdate[]>();

  trackShipment(trackingNumber: string): DeliveryUpdate | null {
    for (const updates of this.updates.values()) {
      const update = updates.find(u => u.shipmentId === trackingNumber);
      if (update) return update;
    }
    return null;
  }

  recordUpdate(update: DeliveryUpdate): void {
    if (!this.updates.has(update.shipmentId)) {
      this.updates.set(update.shipmentId, []);
    }

    this.updates.get(update.shipmentId)!.push(update);
    logger.debug('Delivery update recorded', { shipmentId: update.shipmentId, status: update.status });
  }

  estimateDelivery(shipmentId: string): number {
    return Date.now() + Math.round(normalize(hashString(`${shipmentId}|eta`), 3, 7)) * 24 * 60 * 60 * 1000;
  }

  getDeliveryHistory(shipmentId: string): DeliveryUpdate[] {
    return this.updates.get(shipmentId) || [];
  }

  optimizeRoute(shipmentIds: string[]): string[] {
    return [...shipmentIds].sort();
  }
}

export class LogisticsPlanner {
  private shipmentCount = 0;
  private consolidationCount = 0;

  planShipment(orderId: string, items: any[]): Shipment {
    const shipmentId = deterministicId('ship', `${orderId}|${items.length}`, this.shipmentCount++);

    return {
      id: shipmentId,
      orderId,
      status: 'pending',
      carrier: 'Standard Carrier',
      trackingNumber: '',
      estimatedDelivery: Date.now() + Math.round(normalize(hashString(`${orderId}|delivery`), 3, 9)) * 24 * 60 * 60 * 1000
    };
  }

  consolidateShipments(orderIds: string[]): string {
    const consolidatedId = deterministicId('consolidated', orderIds.slice().sort().join('|'), this.consolidationCount++);
    logger.debug('Shipments consolidated', { count: orderIds.length, consolidatedId });
    return consolidatedId;
  }

  optimizeCost(shipmentOptions: ShippingRate[]): ShippingRate {
    return shipmentOptions.reduce((lowest, current) =>
      current.cost < lowest.cost ? current : lowest
    );
  }

  estimateCost(shipmentId: string): number {
    return round(normalize(hashString(`${shipmentId}|cost`), 20, 120), 2);
  }
}

export const shippingCarrier = new ShippingCarrier();
export const deliveryTracker = new DeliveryTracker();
export const logisticsPlanner = new LogisticsPlanner();