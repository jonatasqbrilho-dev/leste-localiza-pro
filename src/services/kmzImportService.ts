import JSZip from 'jszip';
import { kml as kmlToGeoJson } from '@tmcw/togeojson';
import { supabase } from '@/supabase/client';
import { categorizarObjeto, extrairCampo } from '@/utils/categorizacao';
import type { GeometryType, GeoObjectProperties } from '@/types';

const LOTE_INSERT = 500; // insere em lotes para não estourar payload em KMZ grandes

/**
 * Muitos KMZ (ex: Enel) não trazem os atributos em campos separados — eles vêm
 * concatenados dentro do <description>, como HTML: "<b>ALIMENTADOR: </b>RSU01N1".
 * Esta função extrai esses pares "Rótulo: valor" e devolve como propriedades planas,
 * para que a busca e os campos (alimentador, subestação etc) funcionem normalmente.
 */
function extrairPropriedadesDaDescricao(description: unknown): Record<string, string> {
  let texto = '';
  if (typeof description === 'string') {
    texto = description;
  } else if (description && typeof description === 'object' && 'value' in (description as Record<string, unknown>)) {
    texto = String((description as Record<string, unknown>).value ?? '');
  } else {
    return {};
  }

  const textoLimpo = texto.replace(/<[^>]+>/g, '\n');
  const resultado: Record<string, string> = {};
  const regex = /([A-Za-zÀ-ÿ0-9 ]{2,40}):\s*([^\n]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(textoLimpo)) !== null) {
    const chave = match[1].trim();
    const valor = match[2].trim();
    if (chave && valor) resultado[chave] = valor;
  }
  return resultado;
}

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
      const propriedadesOriginais = (feature.properties ?? {}) as Record<string, unknown>;
      const propriedadesDescricao = extrairPropriedadesDaDescricao(propriedadesOriginais.description);

      // "properties" final: campos originais (exceto o blob de description) + os
      // pares extraídos do texto da descrição, todos como valores planos (buscáveis).
      const { description: _descricaoOriginal, ...propriedadesEscalar } = propriedadesOriginais;
      const properties: GeoObjectProperties = {
        ...(propriedadesEscalar as GeoObjectProperties),
        ...propriedadesDescricao,
      };

      const nomeCamada = propriedadesOriginais.folder as string | undefined;
      const tipo = feature.geometry.type as GeometryType;
      const categoria = categorizarObjeto(nomeCamada, properties, tipo);

      // código do equipamento: usa CSI/código explícito se existir; senão, usa o
      // <name> do KML (padrão comum em KMZ da Enel: TRL9801, RSU01N1 etc).
      const codigoExplicito = extrairCampo(properties, ['csi', 'codigo', 'código']);
      const nome = typeof propriedadesOriginais.name === 'string' ? propriedadesOriginais.name : null;
      const codigo = codigoExplicito || nome;

      return {
        kmz_id: kmzId,
        tipo,
        geometry: feature.geometry,
        properties,
        codigo,
        municipio: extrairCampo(properties, ['municipio', 'município', 'cidade']),
        alimentador: extrairCampo(properties, ['alimentador']),
        subestacao: extrairCampo(properties, ['subestacao', 'subestação', 'conjunto']),
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
