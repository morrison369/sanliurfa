/**
 * Phase 43: Geographic Intelligence
 * Proximity search, geofencing, location clustering, heatmaps
 */

import { deterministicInt } from './deterministic';
import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoFence {
  id: string;
  name: string;
  center: GeoPoint;
  radiusMeters: number;
}

export interface GeoResult {
  id: string;
  distance: number;
  bearing: number;
}

export interface LocationCluster {
  centroid: GeoPoint;
  points: GeoPoint[];
  radius: number;
}

// ==================== PROXIMITY SEARCH ====================

export class ProximitySearch {
  private locations = new Map<string, { point: GeoPoint; metadata?: Record<string, any> }>();

  /**
   * Add location
   */
  addLocation(id: string, point: GeoPoint, metadata?: Record<string, any>): void {
    this.locations.set(id, { point, metadata });
  }

  /**
   * Remove location
   */
  removeLocation(id: string): void {
    this.locations.delete(id);
  }

  /**
   * Find nearby using haversine distance
   */
  findNearby(center: GeoPoint, radiusMeters: number, limit: number = 10): GeoResult[] {
    const results: GeoResult[] = [];

    for (const [id, { point }] of this.locations) {
      const distance = this.haversineDistance(center, point);

      if (distance <= radiusMeters) {
        results.push({
          id,
          distance: Math.round(distance),
          bearing: this.calculateBearing(center, point)
        });
      }
    }

    return results.sort((a, b) => a.distance - b.distance).slice(0, limit);
  }

  /**
   * Find nearest
   */
  findNearest(center: GeoPoint, limit: number = 10): GeoResult[] {
    const results: GeoResult[] = [];

    for (const [id, { point }] of this.locations) {
      results.push({
        id,
        distance: Math.round(this.haversineDistance(center, point)),
        bearing: this.calculateBearing(center, point)
      });
    }

    return results.sort((a, b) => a.distance - b.distance).slice(0, limit);
  }

  /**
   * Haversine distance calculation
   */
  private haversineDistance(p1: GeoPoint, p2: GeoPoint): number {
    const R = 6371000; // Earth radius in meters
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.lat * Math.PI) / 180) * Math.cos((p2.lat * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Calculate bearing between two points
   */
  private calculateBearing(p1: GeoPoint, p2: GeoPoint): number {
    const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
    const lat1 = (p1.lat * Math.PI) / 180;
    const lat2 = (p2.lat * Math.PI) / 180;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    return Math.atan2(y, x) * (180 / Math.PI);
  }
}

// ==================== GEOFENCE MANAGER ====================

export class GeoFenceManager {
  private fences = new Map<string, GeoFence>();

  /**
   * Create fence
   */
  createFence(fence: GeoFence): void {
    this.fences.set(fence.id, fence);
    logger.debug('Geofence created', { id: fence.id, name: fence.name });
  }

  /**
   * Delete fence
   */
  deleteFence(fenceId: string): void {
    this.fences.delete(fenceId);
  }

  /**
   * Check if point is in any fence
   */
  checkPoint(point: GeoPoint): string[] {
    const fenceIds: string[] = [];
    const ps = new ProximitySearch();

    for (const [id, fence] of this.fences) {
      if (this.isInFence(id, point)) {
        fenceIds.push(id);
      }
    }

    return fenceIds;
  }

  /**
   * Check if point is in specific fence
   */
  isInFence(fenceId: string, point: GeoPoint): boolean {
    const fence = this.fences.get(fenceId);
    if (!fence) return false;

    const ps = new ProximitySearch();
    const distance = ps['haversineDistance'](fence.center, point);

    return distance <= fence.radiusMeters;
  }

  /**
   * List fences
   */
  listFences(): GeoFence[] {
    return Array.from(this.fences.values());
  }
}

// ==================== LOCATION ANALYTICS ====================

export class LocationAnalytics {
  private visits = new Map<string, { userId: string; timestamp: number }[]>();

  /**
   * Record visit
   */
  recordVisit(locationId: string, userId: string, timestamp?: number): void {
    if (!this.visits.has(locationId)) {
      this.visits.set(locationId, []);
    }

    this.visits.get(locationId)!.push({
      userId,
      timestamp: timestamp || Date.now()
    });
  }

  /**
   * Get top locations
   */
  getTopLocations(limit: number = 10): { locationId: string; visits: number }[] {
    const results = Array.from(this.visits.entries())
      .map(([locationId, visits]) => ({
        locationId,
        visits: visits.length
      }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, limit);

    return results;
  }

  /**
   * Cluster points using k-means
   */
  clusterPoints(points: GeoPoint[], k: number): LocationCluster[] {
    if (points.length < k) {
      return points.map(p => ({
        centroid: p,
        points: [p],
        radius: 0
      }));
    }

    const centroids: GeoPoint[] = [];
    const usedIndices = new Set<number>();
    for (let i = 0; i < k; i++) {
      let index = deterministicInt(`geo-cluster:${points.length}:${k}:${i}`, 0, points.length - 1);
      while (usedIndices.has(index)) {
        index = (index + 1) % points.length;
      }
      usedIndices.add(index);
      centroids.push(points[index]);
    }

    const clusters: GeoPoint[][] = Array(k).fill(null).map(() => []);

    // Assign points to nearest centroid
    for (const point of points) {
      let minDist = Infinity;
      let nearestIdx = 0;

      for (let i = 0; i < centroids.length; i++) {
        const dist = Math.pow(point.lat - centroids[i].lat, 2) + Math.pow(point.lng - centroids[i].lng, 2);

        if (dist < minDist) {
          minDist = dist;
          nearestIdx = i;
        }
      }

      clusters[nearestIdx].push(point);
    }

    // Calculate radius for each cluster
    return clusters.map((clusterPoints, idx) => {
      const centroid = centroids[idx];
      let maxDist = 0;

      for (const point of clusterPoints) {
        const dist = Math.pow(point.lat - centroid.lat, 2) + Math.pow(point.lng - centroid.lng, 2);
        maxDist = Math.max(maxDist, dist);
      }

      return {
        centroid,
        points: clusterPoints,
        radius: Math.sqrt(maxDist)
      };
    });
  }
}

// ==================== EXPORTS ====================

export const proximitySearch = new ProximitySearch();
export const geoFenceManager = new GeoFenceManager();
export const locationAnalytics = new LocationAnalytics();
