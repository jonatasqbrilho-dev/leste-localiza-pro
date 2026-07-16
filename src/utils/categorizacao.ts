import type { ObjectCategory, GeoObjectProperties, GeometryType } from '@/types';

/**
 * Infere a categoria do objeto (poste, transformador, rede MT/BT, etc) a partir
 * do nome da camada/pasta do KML e dos atributos dinâmicos, sem depender de um
 * schema fixo — cada concessionária nomeia suas camadas de um jeito diferente,
 * então usamos correspondência por palavras-chave.
 */
const REGRAS: Array<{ categoria: ObjectCategory; palavras: string[] }> = [
  { categoria: 'poste', palavras: ['poste', 'estrutura'] },
  { categoria: 'transformador', palavras: ['transformador', 'trafo'] },
  { categoria: 'rede_mt', palavras: ['rede mt', 'media tensao', 'média tensão', 'mt_', 'rede_mt'] },
  { categoria: 'rede_bt', palavras: ['rede bt', 'baixa tensao', 'baixa tensão', 'bt_', 'rede_bt'] },
  { categoria: 'ramal', palavras: ['ramal'] },
  { categoria: 'chave', palavras: ['chave', 'seccionadora'] },
  { categoria: 'religador', palavras: ['religador'] },
  { categoria: 'consumidor', palavras: ['consumidor', 'unidade consumidora', 'uc_'] },
  { categoria: 'csi', palavras: ['csi'] },
];

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function categorizarObjeto(
  nomeCamada: string | undefined,
  properties: GeoObjectProperties,
  tipoGeometria: GeometryType
): ObjectCategory {
  const textoBusca = normalizar(
    [nomeCamada ?? '', ...Object.values(properties).map((v) => String(v ?? ''))].join(' ')
  );

  for (const regra of REGRAS) {
    if (regra.palavras.some((p) => textoBusca.includes(normalizar(p)))) {
      return regra.categoria;
    }
  }

  // fallback por tipo de geometria
  if (tipoGeometria === 'Point') return 'poste';
  if (tipoGeometria === 'LineString' || tipoGeometria === 'MultiLineString') return 'rede_mt';
  return 'outro';
}

export function extrairCampo(properties: GeoObjectProperties, chaves: string[]): string | null {
  for (const [k, v] of Object.entries(properties)) {
    const chaveNormalizada = normalizar(k);
    if (chaves.some((alvo) => chaveNormalizada.includes(normalizar(alvo)))) {
      return v != null ? String(v) : null;
    }
  }
  return null;
}
