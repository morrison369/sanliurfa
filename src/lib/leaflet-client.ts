import 'leaflet/dist/leaflet.css';
import markerIcon2xUrl from 'leaflet/dist/images/marker-icon-2x.png?url';
import markerIconUrl from 'leaflet/dist/images/marker-icon.png?url';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png?url';

let leafletPromise: Promise<typeof import('leaflet')> | null = null;
let defaultIconPatched = false;

export async function loadLeaflet(): Promise<typeof import('leaflet')> {
  if (!leafletPromise) {
    leafletPromise = import('leaflet').then((module) => {
      const L = (module.default ?? module) as typeof import('leaflet');

      if (!defaultIconPatched) {
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: markerIcon2xUrl,
          iconUrl: markerIconUrl,
          shadowUrl: markerShadowUrl,
        });
        defaultIconPatched = true;
      }

      return L;
    });
  }

  return leafletPromise;
}
