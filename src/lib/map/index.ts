/**
 * Maps Module
 * Stub for map-related functionality
 */

export interface MapLocation {
  lat: number;
  lng: number;
  name?: string;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export class MapManager {
  private locations: MapLocation[] = [];

  addLocation(location: MapLocation): void {
    this.locations.push(location);
  }

  getLocations(): MapLocation[] {
    return this.locations;
  }

  getBounds(): MapBounds | null {
    if (this.locations.length === 0) return null;
    
    const lats = this.locations.map(l => l.lat);
    const lngs = this.locations.map(l => l.lng);
    
    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs)
    };
  }

  calculateDistance(loc1: MapLocation, loc2: MapLocation): number {
    const R = 6371; // Earth's radius in km
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLng = (loc2.lng - loc1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

export const mapManager = new MapManager();
export default mapManager;
