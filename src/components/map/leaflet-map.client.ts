import { loadLeaflet } from '../../lib/leaflet-client';

type MapPlace = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  category?: string;
  thumbnail?: string;
  rating?: number;
  slug?: string;
};

type MapConfig = {
  places: MapPlace[];
  center?: [number, number];
  zoom?: number;
  singlePlace?: boolean;
  showCategoryFilter?: boolean;
};

type ClusteredMapItem =
  | { type: 'single'; place: MapPlace }
  | { type: 'cluster'; count: number; lat: number; lon: number; places: MapPlace[] };

const categoryColors: Record<string, string> = {
  'tarihi-yerler': '#8B4513',
  restoran: '#E63946',
  cafe: '#6F4E37',
  otel: '#1D3557',
  park: '#2A9D8F',
  muze: '#9B2226',
  alisveris: '#E9C46A',
  eglence: '#F4A261',
  spor: '#264653',
  saglik: '#E76F51',
  egitim: '#457B9D',
  dini: '#1D3557',
  dogal: '#2A9D8F',
  piknik: '#A8DADC',
};

function svgUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escHtml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pinSvg(color: string, size: number, label: string, fontSize: number) {
  const half = size / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${half}" cy="${half}" r="${half - 2}" fill="${color}" stroke="white" stroke-width="3"/><text x="${half}" y="${half + 5}" text-anchor="middle" fill="white" font-size="${fontSize}" font-weight="bold">${label}</text></svg>`;
}

function createPlaceIcon(
  L: typeof import('leaflet'),
  category: string | undefined,
  isFeatured: boolean,
) {
  const color = category ? categoryColors[category] || '#F4A261' : '#F4A261';
  const size = isFeatured ? 40 : 32;
  const label = isFeatured ? '★' : '•';
  const fontSize = isFeatured ? 16 : 14;

  return L.icon({
    iconUrl: svgUrl(pinSvg(color, size, label, fontSize)),
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
}

function createClusterIcon(L: typeof import('leaflet'), count: number) {
  const size = count > 100 ? 56 : count > 10 ? 48 : 40;
  const half = size / 2;
  const label = count > 99 ? '99+' : String(count);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${half}" cy="${half}" r="${half - 1}" fill="#B87333" stroke="#EDE0C6" stroke-width="2" opacity="0.9"/><text x="${half}" y="${half + 5}" text-anchor="middle" fill="#EDE0C6" font-size="13" font-weight="bold">${label}</text></svg>`;

  return L.icon({
    iconUrl: svgUrl(svg),
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
}

function clusterPlaces(
  places: MapPlace[],
  zoom: number,
  singlePlace: boolean,
): ClusteredMapItem[] {
  if (singlePlace || zoom >= 15) {
    return places.map((place) => ({ type: 'single' as const, place }));
  }

  const cellDeg = zoom <= 11 ? 0.1 : zoom <= 13 ? 0.05 : 0.02;
  const cells: Record<string, { places: MapPlace[]; latSum: number; lonSum: number }> = {};

  places.forEach((place) => {
    if (!place.lat || !place.lon) return;

    const key = `${Math.ceil(place.lat / cellDeg)}_${Math.ceil(place.lon / cellDeg)}`;
    if (!cells[key]) cells[key] = { places: [], latSum: 0, lonSum: 0 };

    cells[key].places.push(place);
    cells[key].latSum += place.lat;
    cells[key].lonSum += place.lon;
  });

  return Object.values(cells).map((cell) => {
    const count = cell.places.length;
    if (count === 1) {
      return { type: 'single' as const, place: cell.places[0] };
    }

    return {
      type: 'cluster' as const,
      count,
      lat: cell.latSum / count,
      lon: cell.lonSum / count,
      places: cell.places,
    };
  });
}

function initLeafletMap(root: HTMLElement, L: typeof import('leaflet')) {
  if (root.dataset.leafletInitialized === 'true') return;

  const mapId = root.dataset.mapId;
  const mapDataId = root.dataset.mapDataId;
  if (!mapId || !mapDataId) return;

  const mapElement = document.getElementById(mapId);
  const dataElement = document.getElementById(mapDataId);
  if (!(mapElement instanceof HTMLElement) || !(dataElement instanceof HTMLScriptElement)) return;

  const mapData = JSON.parse(dataElement.textContent || '{}') as MapConfig;
  const places = Array.isArray(mapData.places) ? mapData.places : [];
  const center: [number, number] =
    Array.isArray(mapData.center) && mapData.center.length === 2
      ? [Number(mapData.center[0]), Number(mapData.center[1])]
      : [37.1592, 38.7969];
  const initialZoom = Number.isFinite(mapData.zoom) ? Number(mapData.zoom) : 13;
  const singlePlace = Boolean(mapData.singlePlace);
  const showCategoryFilter = Boolean(mapData.showCategoryFilter);

  const map = L.map(mapId).setView(center, initialZoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);

  const markerLayer = L.layerGroup().addTo(map);
  let activeCategory = '';

  const renderMarkers = () => {
    markerLayer.clearLayers();

    const filtered = activeCategory
      ? places.filter((place) => place.category === activeCategory)
      : places;

    const items = clusterPlaces(filtered, map.getZoom(), singlePlace);
    items.forEach((item: ClusteredMapItem) => {
      if (item.type === 'cluster') {
        const names = item.places
          .slice(0, 5)
          .map((place: MapPlace) => escHtml(place.name))
          .join(', ');
        const more = item.count > 5 ? ` +${item.count - 5} daha` : '';
        const marker = L.marker([item.lat, item.lon], { icon: createClusterIcon(L, item.count) });
        marker.bindPopup(`<strong>${item.count} mekan</strong><br>${names}${more}`);
        markerLayer.addLayer(marker);
        return;
      }

      const place = item.place;
      if (!place.lat || !place.lon) return;

      const isFeatured = Number(place.rating) >= 4.5;
      const marker = L.marker([place.lat, place.lon], {
        icon: createPlaceIcon(L, place.category, isFeatured),
      });

      let popup = '<div style="min-width:200px;font-family:system-ui">';
      if (place.thumbnail) {
        popup += `<img src="${escHtml(place.thumbnail)}" alt="${escHtml(place.name)}" style="width:100%;height:100px;object-fit:cover;border-radius:8px;margin-bottom:8px">`;
      }
      popup += `<h3 style="margin:0 0 4px;font-size:16px;font-weight:600">${escHtml(place.name)}</h3>`;
      if (place.rating) {
        const stars = '★'.repeat(Math.floor(Number(place.rating)));
        popup += `<div style="color:#F4A261;margin-bottom:4px">${stars} <span style="color:#999">${Number(place.rating).toFixed(1)}</span></div>`;
      }
      if (place.slug) {
        popup += `<a href="/isletme/${escHtml(place.slug)}" style="color:#D97706;text-decoration:none;font-weight:500;display:inline-block;margin-top:4px">Detayları Gör →</a>`;
      }
      popup += '</div>';

      marker.bindPopup(popup);
      markerLayer.addLayer(marker);
    });
  };

  renderMarkers();

  if (!singlePlace && places.length > 0) {
    const validPlaces = places.filter((place) => place.lat && place.lon);
    if (validPlaces.length > 1) {
      const group = L.featureGroup(validPlaces.map((place) => L.marker([place.lat, place.lon])));
      map.fitBounds(group.getBounds().pad(0.1));
    }
  }

  map.on('zoomend', renderMarkers);

  if (showCategoryFilter) {
    const filterElement = document.getElementById(`${mapId}-filters`);
    filterElement?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const button = target.closest('.lm-filter-btn');
      if (!(button instanceof HTMLButtonElement)) return;

      activeCategory = button.dataset.category || '';
      filterElement.querySelectorAll('.lm-filter-btn').forEach((item) => {
        item.classList.toggle('lm-filter-active', item === button);
      });
      renderMarkers();
    });
  }

  const LocateControl = L.Control.extend({
    options: { position: 'bottomright' as const },
    onAdd(controlMap: import('leaflet').Map) {
      const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
      const button = L.DomUtil.create('a', 'lm-locate-btn', container);
      button.textContent = '📍';
      button.title = 'Konumumu Bul';
      button.href = '#';

      L.DomEvent.on(button, 'click', (event) => {
        L.DomEvent.stopPropagation(event);
        L.DomEvent.preventDefault(event);
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition((position) => {
          const { latitude, longitude } = position.coords;
          controlMap.setView([latitude, longitude], 15);

          const locSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="5" fill="#3B82F6" stroke="white" stroke-width="3"/></svg>';
          L.marker([latitude, longitude], {
            icon: L.icon({
              iconUrl: svgUrl(locSvg),
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            }),
          })
            .addTo(controlMap)
            .bindPopup('Konumunuz')
            .openPopup();
        });
      });

      return container;
    },
  });

  new LocateControl().addTo(map);
  root.dataset.leafletInitialized = 'true';
}

export function initLeafletMaps() {
  const roots = document.querySelectorAll<HTMLElement>('[data-leaflet-map-root]');
  if (roots.length === 0) return;

  void loadLeaflet().then((L) => {
    roots.forEach((root) => initLeafletMap(root, L));
  });
}
