export type UserRole = 'admin' | 'user';

export interface Profile {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  criado_em: string;
}

export type GeometryType =
  | 'Point'
  | 'LineString'
  | 'Polygon'
  | 'MultiLineString'
  | 'MultiPolygon'
  | 'MultiPoint';

export interface KmzFile {
  id: string;
  nome: string;
  storage_path: string;
  data_upload: string;
  usuario_id: string;
  total_objetos: number;
  status: 'processando' | 'concluido' | 'erro';
  regional: string | null;
  erro_mensagem: string | null;
}

/** Atributos dinâmicos vindos do KMZ — schema livre, por isso JSONB */
export type GeoObjectProperties = Record<string, string | number | boolean | null>;

export interface GeoObject {
  id: string;
  kmz_id: string;
  tipo: GeometryType;
  geometry: GeoJSON.Geometry;
  properties: GeoObjectProperties;
  codigo: string | null;
  municipio: string | null;
  alimentador: string | null;
  subestacao: string | null;
  regional: string | null;
  categoria: ObjectCategory | null;
  latitude: number | null;
  longitude: number | null;
  search_text: string | null;
}

/** Categoria inferida do objeto para fins de camadas/ícones */
export type ObjectCategory =
  | 'poste'
  | 'transformador'
  | 'rede_mt'
  | 'rede_bt'
  | 'ramal'
  | 'chave'
  | 'religador'
  | 'consumidor'
  | 'csi'
  | 'outro';

export interface SearchResult extends GeoObject {
  kmz_nome: string;
}

export interface Favorito {
  id: string;
  usuario_id: string;
  geo_object_id: string;
  criado_em: string;
  geo_object?: GeoObject;
}

export interface PesquisaRecente {
  id: string;
  usuario_id: string;
  termo: string;
  geo_object_id: string | null;
  criado_em: string;
}

export interface LogEntry {
  id: string;
  usuario_id: string | null;
  acao: string;
  detalhes: Record<string, unknown> | null;
  criado_em: string;
}

export interface LayerVisibility {
  poste: boolean;
  transformador: boolean;
  rede_mt: boolean;
  rede_bt: boolean;
  ramal: boolean;
  chave: boolean;
  religador: boolean;
  consumidor: boolean;
  outro: boolean;
}

export const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
  poste: true,
  transformador: true,
  rede_mt: true,
  rede_bt: true,
  ramal: true,
  chave: true,
  religador: true,
  consumidor: true,
  outro: true,
};
