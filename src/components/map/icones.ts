import L from 'leaflet';
import type { ObjectCategory } from '@/types';

/** Cor por categoria — usada nos marcadores e na legenda de camadas */
export const CORES_CATEGORIA: Record<ObjectCategory, string> = {
  poste: '#64748b',
  transformador: '#f59e0b',
  rede_mt: '#dc2626',
  rede_bt: '#2563eb',
  ramal: '#7c3aed',
  chave: '#059669',
  religador: '#0891b2',
  consumidor: '#16a34a',
  csi: '#e11d48',
  outro: '#6b7280',
}; 

export function criarIconeCategoria(categoria: ObjectCategory, destaque = false): L.DivIcon {
  const cor = CORES_CATEGORIA[categoria] ?? CORES_CATEGORIA.outro;
  const tamanho = destaque ? 34 : 22;
  return L.divIcon({
    className: 'marcador-categoria',
    html: `<span style="
      display:block;width:${tamanho}px;height:${tamanho}px;border-radius:50%;
      background:${cor};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);
      ${destaque ? 'outline:3px solid rgba(37,99,235,.35);' : ''}
    "></span>`,
    iconSize: [tamanho, tamanho],
    iconAnchor: [tamanho / 2, tamanho / 2],
  });
}
