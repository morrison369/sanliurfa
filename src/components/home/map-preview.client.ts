import { loadLeaflet } from '../../lib/leaflet-client';

function initMapPreview(element: HTMLElement, L: typeof import('leaflet')) {
  if (element.dataset.leafletInitialized === 'true') return;

  const rawPlaces = element.dataset.places;
  const places = rawPlaces ? JSON.parse(rawPlaces) : [];
  if (!Array.isArray(places) || places.length === 0) return;

  const map = L.map(element, {
    zoomControl: true,
    scrollWheelZoom: false,
    dragging: true,
    attributionControl: false,
  }).setView([37.16, 38.79], 11);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
  }).addTo(map);

  const customIcon = L.divIcon({
    className: 'mp-marker',
    html: '<div style="width:1.5rem;height:1.5rem;background:linear-gradient(135deg,#C0571F,#D49718);border:2px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 8px rgba(31,20,16,.3)"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -22],
  });

  const bounds: [number, number][] = [];
  places.forEach((place: { lat?: number; lng?: number; name?: string; slug?: string; rating?: number }) => {
    if (!place.lat || !place.lng) return;

    bounds.push([place.lat, place.lng]);
    const marker = L.marker([place.lat, place.lng], { icon: customIcon }).addTo(map);
    const stars = place.rating ? '★'.repeat(Math.round(place.rating)) : '';
    marker.bindPopup(
      `<a href="/isletme/${place.slug ?? ''}"><strong>${place.name ?? ''}</strong></a>${
        stars ? `<br><span style="color:#D49718">${stars}</span>` : ''
      }`,
    );
  });

  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [40, 40] });
  }

  element.dataset.leafletInitialized = 'true';
}

export function initHomeMapPreviews() {
  const targets = document.querySelectorAll<HTMLElement>('[data-home-map-preview]');
  if (targets.length === 0) return;

  void loadLeaflet().then((L) => {
    targets.forEach((target) => {
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              initMapPreview(target, L);
              observer.disconnect();
            });
          },
          { rootMargin: '200px' },
        );
        observer.observe(target);
      } else {
        setTimeout(() => initMapPreview(target, L), 1500);
      }
    });
  });
}
