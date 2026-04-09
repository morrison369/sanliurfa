/**
 * Phase 11: Global Distribution & CDN Integration
 * Content delivery network, geo-replication, edge caching, multi-region failover
 */

import { logger } from './logging';

// ==================== GEO-LOCATION UTILITIES ====================

export interface GeoLocation {
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface CDNEdge {
  name: string;
  location: GeoLocation;
  hostname: string;
  bandwidth: number; // Mbps
  latency: number; // ms
  availability: number; // 99.9
}

/**
 * Parse geo-location from CloudFlare headers (or similar CDN)
 */
export function parseGeoLocation(headers: Record<string, string>): GeoLocation | null {
  const country = headers['cf-ipcountry'] || headers['x-country-code'];
  const city = headers['cf-ipcity'] || headers['x-city'];
  const latHeader = headers['cf-latitude'];
  const lonHeader = headers['cf-longitude'];
  const timezone = headers['x-timezone'];

  if (!country) return null;

  return {
    country,
    region: headers['cf-region'] || '',
    city: city || '',
    latitude: latHeader ? parseFloat(latHeader) : 0,
    longitude: lonHeader ? parseFloat(lonHeader) : 0,
    timezone: timezone || 'UTC'
  };
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

// ==================== CDN MANAGEMENT ====================

export const CDN_EDGES: Record<string, CDNEdge> = {
  'us-east': {
    name: 'US East Coast',
    location: {
      country: 'US',
      region: 'Virginia',
      city: 'Ashburn',
      latitude: 38.8916,
      longitude: -77.1558,
      timezone: 'America/New_York'
    },
    hostname: 'us-east.cdn.sanliurfa.com',
    bandwidth: 1000,
    latency: 0,
    availability: 99.99
  },
  'eu-west': {
    name: 'EU West',
    location: {
      country: 'DE',
      region: 'Hesse',
      city: 'Frankfurt',
      latitude: 50.1109,
      longitude: 8.6821,
      timezone: 'Europe/Berlin'
    },
    hostname: 'eu-west.cdn.sanliurfa.com',
    bandwidth: 1000,
    latency: 0,
    availability: 99.99
  },
  'asia-sg': {
    name: 'Asia Singapore',
    location: {
      country: 'SG',
      region: 'Singapore',
      city: 'Singapore',
      latitude: 1.3521,
      longitude: 103.8198,
      timezone: 'Asia/Singapore'
    },
    hostname: 'asia-sg.cdn.sanliurfa.com',
    bandwidth: 1000,
    latency: 0,
    availability: 99.95
  },
  'tr-central': {
    name: 'Turkey Central',
    location: {
      country: 'TR',
      region: 'Şanlıurfa',
      city: 'Şanlıurfa',
      latitude: 37.1592,
      longitude: 38.7969,
      timezone: 'Europe/Istanbul'
    },
    hostname: 'tr-central.cdn.sanliurfa.com',
    bandwidth: 500,
    latency: 0,
    availability: 99.9
  }
};

/**
 * Find nearest CDN edge for geo-location
 */
export function findNearestEdge(geoLocation: GeoLocation | null): CDNEdge {
  if (!geoLocation) {
    return CDN_EDGES['eu-west']; // Default fallback
  }

  let nearest: CDNEdge | null = null;
  let minDistance = Infinity;

  for (const edge of Object.values(CDN_EDGES)) {
    const distance = calculateDistance(
      geoLocation.latitude,
      geoLocation.longitude,
      edge.location.latitude,
      edge.location.longitude
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = edge;
    }
  }

  return nearest || CDN_EDGES['eu-west'];
}

// ==================== EDGE CACHING ====================

export interface EdgeCachePolicy {
  path: string; // URL pattern
  ttl: number; // seconds
  cacheControl: 'public' | 'private' | 'no-cache';
  maxAge: number;
  sMaxAge: number; // Shared cache (CDN) TTL
  staleWhileRevalidate: number; // Serve stale while fetching fresh
}

/**
 * Default edge cache policies
 */
export const EDGE_CACHE_POLICIES: EdgeCachePolicy[] = [
  {
    path: '/images/**',
    ttl: 86400 * 30, // 30 days
    cacheControl: 'public',
    maxAge: 86400 * 30,
    sMaxAge: 86400 * 365, // Cache at CDN for 1 year
    staleWhileRevalidate: 604800 // Serve stale for 7 days
  },
  {
    path: '/api/places',
    ttl: 300, // 5 minutes
    cacheControl: 'public',
    maxAge: 300,
    sMaxAge: 3600, // Longer CDN cache
    staleWhileRevalidate: 86400
  },
  {
    path: '/api/auth/**',
    ttl: 0,
    cacheControl: 'private',
    maxAge: 0,
    sMaxAge: 0,
    staleWhileRevalidate: 0
  },
  {
    path: '/api/**',
    ttl: 60,
    cacheControl: 'public',
    maxAge: 60,
    sMaxAge: 300,
    staleWhileRevalidate: 3600
  }
];

/**
 * Build cache control header based on policy
 */
export function buildCacheControlHeader(policy: EdgeCachePolicy): string {
  const parts: string[] = [policy.cacheControl];

  if (policy.maxAge > 0) {
    parts.push(`max-age=${policy.maxAge}`);
  }

  if (policy.sMaxAge > 0) {
    parts.push(`s-maxage=${policy.sMaxAge}`);
  }

  if (policy.staleWhileRevalidate > 0) {
    parts.push(`stale-while-revalidate=${policy.staleWhileRevalidate}`);
  }

  return parts.join(', ');
}

/**
 * Find matching cache policy for URL
 */
export function matchCachePolicy(path: string): EdgeCachePolicy {
  for (const policy of EDGE_CACHE_POLICIES) {
    const pattern = policy.path.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
    const regex = new RegExp(`^${pattern}$`);

    if (regex.test(path)) {
      return policy;
    }
  }

  // Default policy
  return {
    path: '/**',
    ttl: 60,
    cacheControl: 'public',
    maxAge: 60,
    sMaxAge: 300,
    staleWhileRevalidate: 3600
  };
}

// ==================== GEO-REPLICATION ====================

export interface ReplicationConfig {
  primaryRegion: string;
  replicas: string[]; // Region names
  syncInterval: number; // seconds
  failoverThreshold: number; // consecutive failures before failover
}

/**
 * Geo-replication configuration
 */
export const GEO_REPLICATION_CONFIG: ReplicationConfig = {
  primaryRegion: 'tr-central',
  replicas: ['eu-west', 'us-east', 'asia-sg'],
  syncInterval: 60, // Sync every minute
  failoverThreshold: 3 // Failover after 3 consecutive failures
};

/**
 * Health check response
 */
export interface HealthCheckResult {
  region: string;
  healthy: boolean;
  latency: number;
  lastCheck: number;
  consecutiveFailures: number;
}

/**
 * Track region health for failover
 */
export class RegionHealthMonitor {
  private healthStatus = new Map<string, HealthCheckResult>();
  private readonly checkInterval = 30000; // 30 seconds

  constructor() {
    // Initialize all regions as healthy
    for (const region of Object.keys(CDN_EDGES)) {
      this.healthStatus.set(region, {
        region,
        healthy: true,
        latency: 0,
        lastCheck: Date.now(),
        consecutiveFailures: 0
      });
    }
  }

  /**
   * Record health check result
   */
  recordHealthCheck(region: string, latency: number, success: boolean): void {
    const current = this.healthStatus.get(region);
    if (!current) return;

    if (success) {
      current.healthy = true;
      current.latency = latency;
      current.consecutiveFailures = 0;
    } else {
      current.consecutiveFailures++;
      if (current.consecutiveFailures >= GEO_REPLICATION_CONFIG.failoverThreshold) {
        current.healthy = false;
        logger.warn(`Region ${region} marked unhealthy after ${current.consecutiveFailures} failures`);
      }
    }

    current.lastCheck = Date.now();
  }

  /**
   * Get healthy regions
   */
  getHealthyRegions(): string[] {
    return Array.from(this.healthStatus.values())
      .filter(h => h.healthy)
      .map(h => h.region);
  }

  /**
   * Get fastest region
   */
  getFastestRegion(): string {
    let fastest: HealthCheckResult | null = null;
    let minLatency = Infinity;

    for (const health of this.healthStatus.values()) {
      if (health.healthy && health.latency < minLatency) {
        minLatency = health.latency;
        fastest = health;
      }
    }

    return fastest?.region || GEO_REPLICATION_CONFIG.primaryRegion;
  }

  /**
   * Get all health statuses
   */
  getAllHealth(): HealthCheckResult[] {
    return Array.from(this.healthStatus.values());
  }
}

// ==================== REQUEST ROUTING ====================

/**
 * Route request to optimal CDN edge
 */
export function routeRequestToEdge(
  headers: Record<string, string>,
  healthMonitor: RegionHealthMonitor
): CDNEdge {
  // Parse geo-location from headers
  const geoLocation = parseGeoLocation(headers);

  // Find nearest edge
  let nearest = findNearestEdge(geoLocation);

  // Check if nearest is healthy
  const healthyRegions = healthMonitor.getHealthyRegions();
  if (!healthyRegions.includes(nearest.name)) {
    // Failover to fastest healthy region
    const fastestHealthy = healthMonitor.getFastestRegion();
    nearest = CDN_EDGES[fastestHealthy] || nearest;
  }

  return nearest;
}

// ==================== EXPORTS ====================

export const regionHealthMonitor = new RegionHealthMonitor();
