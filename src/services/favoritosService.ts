import { supabase } from '@/supabase/client';

export async function listarFavoritos(usuarioId: string) {
  const { data, error } = await supabase
    .from('favoritos')
    .select('*, geo_object:geo_objects(*)')
    .eq('usuario_id', usuarioId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function favoritar(usuarioId: string, geoObjectId: string) {
  const { error } = await supabase.from('favoritos').insert({ usuario_id: usuarioId, geo_object_id: geoObjectId });
  if (error) throw error;
}

export async function desfavoritar(usuarioId: string, geoObjectId: string) {
  const { error } = await supabase
    .from('favoritos')
    .delete()
    .eq('usuario_id', usuarioId)
    .eq('geo_object_id', geoObjectId);
  if (error) throw error;
}
