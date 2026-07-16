import JSZip from 'jszip';
import { kml as kmlToGeoJson } from '@tmcw/togeojson';
import { supabase } from '@/supabase/client';
import { categorizarObjeto, extrairCampo } from '@/utils/categorizacao';
import type { GeometryType, GeoObjectProperties } from '@/types';

const LOTE_INSERT = 500; // insere em lotes para não estourar payload em KMZ grandes

export interface ProgressoImportacao {
  etapa: 'lendo' | 'convertendo' | 'enviando_storage' | 'salvando_objetos' | 'concluido' | 'erro';
  objetosProcessados: number;
  totalObjetos: number;
  mensagem?: string;
}

/**
 * Descompacta o KMZ, extrai o .kml interno e converte para GeoJSON.
 */
async function extrairGeoJsonDoKmz(arquivo: File): Promise<GeoJSON.FeatureCollection> {
  const zip = await JSZip.loadAsync(arquivo);
  const kmlEntry = Object.values(zip.files).find((f) => f.name.toLowerCase().endsWith('.kml'));
  if (!kmlEntry) throw new Error('Nenhum arquivo .kml encontrado dentro do KMZ.');

  const kmlText = await kmlEntry.async('text');
  const parser = new DOMParser();
  const kmlDom = parser.parseFromString(kmlText, 'text/xml');

  return kmlToGeoJson(kmlDom) as GeoJSON.FeatureCollection;
}

/**
 * Fluxo completo de importação de um KMZ:
 * 1. Recebe o arquivo
 * 2. Descompacta e lê o KML
 * 3. Converte para GeoJSON
 * 4. Salva o KMZ original no Supabase Storage
 * 5. Salva todos os objetos (geo_objects) no banco, em lotes
 */
export async function importarKmz(
  arquivo: File,
  usuarioId: string,
  onProgress?: (p: ProgressoImportacao) => void
): Promise<{ kmzId: string; totalObjetos: number }> {
  onProgress?.({ etapa: 'lendo', objetosProcessados: 0, totalObjetos: 0 });

  // 1–3. descompacta, lê e converte
  const geojson = await extrairGeoJsonDoKmz(arquivo);
  const features = geojson.features.filter((f) => f.geometry != null);

  onProgress?.({ etapa: 'convertendo', objetosProcessados: 0, totalObjetos: features.length });

  // registra o KMZ como "processando"
  const { data: kmzRow, error: kmzError } = await supabase
    .from('kmz_files')
    .insert({ nome: arquivo.name, storage_path: '', usuario_id: usuarioId, status: 'processando' })
    .select()
    .single();
  if (kmzError) throw kmzError;
  const kmzId = kmzRow.id as string;

  try {
    // 4. envia o KMZ original para o Storage
    onProgress?.({ etapa: 'enviando_storage', objetosProcessados: 0, totalObjetos: features.length });
    const storagePath = `${usuarioId}/${kmzId}/${arquivo.name}`;
    const { error: uploadError } = await supabase.storage.from('kmz-files').upload(storagePath, arquivo, {
      contentType: 'application/vnd.google-earth.kmz',
      upsert: true,
    });
    if (uploadError) throw uploadError;

    await supabase.from('kmz_files').update({ storage_path: storagePath }).eq('id', kmzId);

    // 5. monta e insere todos os objetos, em lotes
    onProgress?.({ etapa: 'salvando_objetos', objetosProcessados: 0, totalObjetos: features.length });

    const linhas = features.map((feature) => {
      const properties = (feature.properties ?? {}) as GeoObjectProperties;
      const nomeCamada = (feature.properties as Record<string, unknown> | null)?.folder as string | undefined;
      const tipo = feature.geometry.type as GeometryType;
      const categoria = categorizarObjeto(nomeCamada, properties, tipo);

      return {
        kmz_id: kmzId,
        tipo,
        geometry: feature.geometry,
        properties,
        codigo: extrairCampo(properties, ['csi', 'codigo', 'código', 'id']),
        municipio: extrairCampo(properties, ['municipio', 'município', 'cidade']),
        alimentador: extrairCampo(properties, ['alimentador']),
        subestacao: extrairCampo(properties, ['subestacao', 'subestação']),
        regional: extrairCampo(properties, ['regional']),
        categoria,
      };
    });

    let processados = 0;
    for (let i = 0; i < linhas.length; i += LOTE_INSERT) {
      const lote = linhas.slice(i, i + LOTE_INSERT);
      const { error: insertError } = await supabase.from('geo_objects').insert(lote);
      if (insertError) throw insertError;
      processados += lote.length;
      onProgress?.({ etapa: 'salvando_objetos', objetosProcessados: processados, totalObjetos: linhas.length });
    }

    const regionalDetectada = linhas.find((l) => l.regional)?.regional ?? null;
    await supabase
      .from('kmz_files')
      .update({ status: 'concluido', total_objetos: processados, regional: regionalDetectada })
      .eq('id', kmzId);

    await supabase.from('logs').insert({
      usuario_id: usuarioId,
      acao: 'kmz_importado',
      detalhes: { kmz_id: kmzId, nome: arquivo.name, total_objetos: processados },
    });

    onProgress?.({ etapa: 'concluido', objetosProcessados: processados, totalObjetos: processados });
    return { kmzId, totalObjetos: processados };
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : 'Erro desconhecido na importação';
    await supabase.from('kmz_files').update({ status: 'erro', erro_mensagem: mensagem }).eq('id', kmzId);
    onProgress?.({ etapa: 'erro', objetosProcessados: 0, totalObjetos: features.length, mensagem });
    throw err;
  }
}

export async function listarKmzFiles() {
  const { data, error } = await supabase.from('kmz_files').select('*').order('data_upload', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function excluirKmz(kmzId: string, storagePath: string) {
  await supabase.storage.from('kmz-files').remove([storagePath]);
  const { error } = await supabase.from('kmz_files').delete().eq('id', kmzId);
  if (error) throw error;
}
