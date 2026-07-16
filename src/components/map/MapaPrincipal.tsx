import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, ScaleControl, useMap } from 'react-leaflet';
import type { GeoObject, SearchResult, LayerVisibility, ObjectCategory } from '@/types';
import { criarIconeCategoria } from './icones';
import { CoordenadasMouse } from './CoordenadasMouse';
import { GrupoCluster } from './GrupoCluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

interface MapaPrincipalProps {
  destaque: SearchResult | null;
  redeObjetos: GeoObject[];
  layerVisibility: LayerVisibility;
  onSelecionarObjeto: (id: string) => void;
}

function CentralizarNoDestaque({ destaque }: { destaque: SearchResult | null }) {
  const map = useMap();
  useMemo(() => {
    if (destaque?.latitude && destaque?.longitude) {
      map.flyTo([destaque.latitude, destaque.longitude], 17, { duration: 0.8 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destaque?.id]);
  return null;
}

function visivel(categoria: ObjectCategory | null, layers: LayerVisibility): boolean {
  if (!categoria) return true;
  return layers[categoria as keyof LayerVisibility] ?? true;
}

export function MapaPrincipal({ destaque, redeObjetos, layerVisibility, onSelecionarObjeto }: MapaPrincipalProps) {
  const centroInicial: [number, number] = destaque?.latitude
    ? [destaque.latitude, destaque.longitude!]
    : [-4.9384, -37.9758]; // Russas/CE como fallback regional

  const pontos = redeObjetos.filter((o) => o.tipo === 'Point' && visivel(o.categoria, layerVisibility));
  const linhas = redeObjetos.filter(
    (o) => (o.tipo === 'LineString' || o.tipo === 'MultiLineString') && visivel(o.categoria, layerVisibility)
  );
  const poligonos = redeObjetos.filter(
    (o) => (o.tipo === 'Polygon' || o.tipo === 'MultiPolygon') && visivel(o.categoria, layerVisibility)
  );

  return (
    <MapContainer center={centroInicial} zoom={13} className="h-full w-full" zoomControl>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ScaleControl position="bottomleft" />
      <CoordenadasMouse />
      <CentralizarNoDestaque destaque={destaque} />

      {destaque?.latitude && destaque?.longitude && (
        <Marker
          position={[destaque.latitude, destaque.longitude]}
          icon={criarIconeCategoria(destaque.categoria ?? 'csi', true)}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{destaque.codigo ?? 'Sem código'}</p>
              <p>{destaque.municipio}</p>
              <p className="text-muted-foreground">{destaque.subestacao}</p>
            </div>
          </Popup>
        </Marker>
      )}

      {linhas.map((obj) => {
        const coords = extrairLatLngsDeLinha(obj.geometry);
        return coords.map((linha, i) => (
          <Polyline
            key={`${obj.id}-${i}`}
            positions={linha}
            pathOptions={{ color: corDaCategoria(obj.categoria), weight: 3 }}
            eventHandlers={{ click: () => onSelecionarObjeto(obj.id) }}
          />
        ));
      })}

      {poligonos.map((obj) => {
        const coords = extrairLatLngsDePoligono(obj.geometry);
        return coords.map((anel, i) => (
          <Polygon
            key={`${obj.id}-${i}`}
            positions={anel}
            pathOptions={{ color: corDaCategoria(obj.categoria), fillOpacity: 0.15 }}
            eventHandlers={{ click: () => onSelecionarObjeto(obj.id) }}
          />
        ));
      })}

      <GrupoCluster
        pontos={pontos.map((obj) => ({
          id: obj.id,
          lat: obj.latitude!,
          lng: obj.longitude!,
          icon: criarIconeCategoria(obj.categoria ?? 'outro'),
          onClick: () => onSelecionarObjeto(obj.id),
          popupHtml: `<div style="font-size:13px"><strong>${obj.codigo ?? obj.categoria ?? ''}</strong>${obj.municipio ? `<br/>${obj.municipio}` : ''}</div>`,
        }))}
      />
    </MapContainer>
  );
}

function corDaCategoria(categoria: ObjectCategory | null): string {
  const mapa: Record<string, string> = {
    rede_mt: '#dc2626',
    rede_bt: '#2563eb',
    ramal: '#7c3aed',
  };
  return mapa[categoria ?? ''] ?? '#64748b';
}

function extrairLatLngsDeLinha(geometry: GeoJSON.Geometry): [number, number][][] {
  if (geometry.type === 'LineString') {
    return [geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number])];
  }
  if (geometry.type === 'MultiLineString') {
    return geometry.coordinates.map((linha) => linha.map(([lng, lat]) => [lat, lng] as [number, number]));
  }
  return [];
}

function extrairLatLngsDePoligono(geometry: GeoJSON.Geometry): [number, number][][] {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.map((anel) => anel.map(([lng, lat]) => [lat, lng] as [number, number]));
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.flatMap((poligono) =>
      poligono.map((anel) => anel.map(([lng, lat]) => [lat, lng] as [number, number]))
    );
  }
  return [];
}
