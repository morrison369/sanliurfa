import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, Layer } from 'leaflet';
import { loadLeaflet } from '../lib/leaflet-client';

interface MapProps {
 lat: number;
 lng: number;
 zoom?: number;
 markers?: Array<{
 lat: number;
 lng: number;
 title?: string;
 id?: string;
 }>;
 height?: string;
 onMarkerClick?: (id: string) => void;
}

// Leaflet harita bileşeni - Ücretsiz OpenStreetMap
export default function Map({ lat, lng, zoom = 15, markers = [], height = '400px', onMarkerClick }: MapProps) {
 const mapRef = useRef<HTMLDivElement>(null);
 const leafletMapRef = useRef<LeafletMap | null>(null);
 const leafletLibRef = useRef<typeof import('leaflet') | null>(null);
 const [isLoaded, setIsLoaded] = useState(false);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 let cancelled = false;

 void loadLeaflet()
 .then((L) => {
 if (cancelled) return;
 leafletLibRef.current = L;
 setIsLoaded(true);
 })
 .catch(() => {
 if (cancelled) return;
 setError('Harita yüklenemedi');
 });

 return () => {
 cancelled = true;
 };
 }, []);

 useEffect(() => {
 if (!isLoaded || !mapRef.current || error) return;

 const L = leafletLibRef.current;
 if (!L) return;

 // Haritayı oluştur
 if (!leafletMapRef.current) {
 leafletMapRef.current = L.map(mapRef.current).setView([lat, lng], zoom);

 // OpenStreetMap katmanı ekle
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
 attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
 maxZoom: 19,
 }).addTo(leafletMapRef.current);
 } else {
 leafletMapRef.current.setView([lat, lng], zoom);
 }

 const mapInstance = leafletMapRef.current;
 if (!mapInstance) return;

 // Markerları temizle ve ekle
 mapInstance.eachLayer((layer: Layer) => {
 if (layer instanceof L.Marker) {
 mapInstance.removeLayer(layer);
 }
 });

 // Custom marker icon
 // Merkez marker veya custom markerlar
 if (markers.length === 0) {
 L.marker([lat, lng])
 .addTo(mapInstance)
 .bindPopup('Konum');
 } else {
 markers.forEach((marker) => {
 const mapMarker = L.marker([marker.lat, marker.lng])
 .addTo(mapInstance);

 if (marker.title) {
 mapMarker.bindPopup(marker.title);
 }

 mapMarker.on('click', () => {
 if (marker.id && onMarkerClick) {
 onMarkerClick(marker.id);
 }
 });
 });
 }
 }, [isLoaded, lat, lng, zoom, markers, onMarkerClick, error]);

 if (error) {
 return (
 <div style={{ height, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
 <div style={{ textAlign: 'center', padding: '20px' }}>
 <div style={{ fontSize: '32px', marginBottom: '8px' }}>📍</div>
 <p>Konum: {lat.toFixed(6)}, {lng.toFixed(6)}</p>
 <a 
 href={`https://www.google.com/maps?q=${lat},${lng}`}
 target="_blank"
 rel="noopener noreferrer"
 style={{
 display: 'inline-block',
 marginTop: '8px',
 padding: '8px 16px',
 background: '#e63946',
 color: 'white',
 textDecoration: 'none',
 borderRadius: '4px'
 }}
 >
 Haritada Aç
 </a>
 </div>
 </div>
 );
 }

 return (
 <div
 ref={mapRef}
 style={{
 width: '100%',
 height,
 background: '#e5e3df',
 borderRadius: '8px',
 zIndex: 1
 }}
 >
 {!isLoaded && (
 <div style={{
 height: '100%',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 color: '#666',
 }}>
 <div style={{ textAlign: 'center' }}>
 <div style={{ fontSize: '32px', marginBottom: '8px' }}>🗺️</div>
 <p>Harita yükleniyor...</p>
 </div>
 </div>
 )}
 </div>
 );
}

// Adresten koordinat bulma (Nominatim - ücretsiz)
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
 try {
 const response = await fetch(
 `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
 {
 headers: {
 'User-Agent': 'Sanliurfa.com/1.0'
 }
 }
 );
 
 const data = await response.json();
 
 if (data && data.length > 0) {
 return { 
 lat: parseFloat(data[0].lat), 
 lng: parseFloat(data[0].lon) 
 };
 }
 
 return null;
 } catch (error) {
 console.error('Geocoding error:', error);
 return null;
 }
}

// İki nokta arası mesafe hesaplama (Haversine formülü)
export function calculateDistance(
 lat1: number,
 lng1: number,
 lat2: number,
 lng2: number
): number {
 const R = 6371; // Dünya yarıçapı km
 const dLat = (lat2 - lat1) * Math.PI / 180;
 const dLng = (lng2 - lng1) * Math.PI / 180;
 const a = 
 Math.sin(dLat/2) * Math.sin(dLat/2) +
 Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
 Math.sin(dLng/2) * Math.sin(dLng/2);
 const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
 return Math.round(R * c * 10) / 10; // 1 ondalık
}

// Yol tarifi URL'i oluştur
export function getDirectionsUrl(from: { lat: number; lng: number }, to: { lat: number; lng: number }): string {
 return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${from.lat},${from.lng};${to.lat},${to.lng}`;
}
