import { useState } from 'react';
import { useMapEvents } from 'react-leaflet';

/** Mostra as coordenadas do mouse no canto do mapa, como no Google Maps. */
export function CoordenadasMouse() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useMapEvents({
    mousemove: (e) => setCoords({ lat: e.latlng.lat, lng: e.latlng.lng }),
    mouseout: () => setCoords(null),
  });

  if (!coords) return null;

  return (
    <div className="pointer-events-none absolute bottom-2 left-2 z-[1000] rounded bg-black/70 px-2 py-1 font-mono text-[11px] text-white">
      {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
    </div>
  );
}
