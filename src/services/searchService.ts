import { supabase } from '@/supabase/client';
import type { SearchResult, GeoObject } from '@/types';

/**
 * Busca objetos usando a função SQL `buscar_objetos`, que combina
 * full text search (português) com trigram para tolerância a erro de digitação.
 * Nunca varre KMZ em disco — tudo é indexado no banco na importação.
 */
export async function buscarObjetos(termo: string, limite = 30): Promise<SearchResult[]> {
  if (!termo.trim()) return [];

  const { data, error } = await supabase.rpc('buscar_objetos', { termo, limite });
  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    kmz_nome: row.kmz_nome,
  })) as SearchResult[];
}

/**
 * "Ver Rede": carrega SOMENTE os objetos do KMZ ao qual o objeto pertence.
 * Nunca carrega múltiplos KMZ simultaneamente.
 */
export async function carregarRedeDoObjeto(objetoId: string): Promise<GeoObject[]> {
  const { data, error } = await supabase.rpc('rede_do_objeto', { objeto_id: objetoId });
  if (error) throw error;
  return (data ?? []) as GeoObject[];
}

export async function carregarRedePorKmz(kmzId: string): Promise<GeoObject[]> {
  const { data, error } = await supabase.from('geo_objects').select('*').eq('kmz_id', kmzId);
  if (error) throw error;
  return (data ?? []) as GeoObject[];
}

export async function registrarPesquisaRecente(usuarioId: string, termo: string, geoObjectId: string | null) {
  await supabase.from('pesquisas_recentes').insert({ usuario_id: usuarioId, termo, geo_object_id: geoObjectId });
}

export async function listarPesquisasRecentes(usuarioId: string, limite = 10) {
  const { data, error } = await supabase
    .from('pesquisas_recentes')
    .select('*, geo_object:geo_objects(*)')
    .eq('usuario_id', usuarioId)
    .order('criado_em', { ascending: false })
    .limit(limite);
  if (error) throw error;
  return data ?? [];
}
