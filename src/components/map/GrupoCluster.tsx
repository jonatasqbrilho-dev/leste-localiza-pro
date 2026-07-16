import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';

interface GrupoClusterProps {
  pontos: Array<{ id: string; lat: number; lng: number; icon: L.DivIcon; onClick: () => void; popupHtml?: string }>;
}

/**
 * Substitui react-leaflet-cluster (que ainda não suporta react-leaflet v5 / React 19).
 * Cria um L.markerClusterGroup imperativamente e o anexa ao mapa.
 */
export function GrupoCluster({ pontos }: GrupoClusterProps) {
  const map = useMap();
  const grupoRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    const grupo = L.markerClusterGroup({ chunkedLoading: true, maxClusterRadius: 60 });
    grupoRef.current = grupo;
    map.addLayer(grupo);
    return () => {
      map.removeLayer(grupo);
    };
  }, [map]);

  useEffect(() => {
    const grupo = grupoRef.current;
    if (!grupo) return;
    grupo.clearLayers();

    for (const ponto of pontos) {
      const marker = L.marker([ponto.lat, ponto.lng], { icon: ponto.icon });
      marker.on('click', ponto.onClick);
      if (ponto.popupHtml) marker.bindPopup(ponto.popupHtml);
      grupo.addLayer(marker);
    }
  }, [pontos]);

  return null;
}
