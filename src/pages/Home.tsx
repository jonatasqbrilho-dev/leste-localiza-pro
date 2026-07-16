import { Header } from '@/components/layout/Header';
import { MapaPrincipal } from '@/components/map/MapaPrincipal';
import { ControleCamadas } from '@/components/map/ControleCamadas';
import { PainelInformacoes } from '@/components/search/PainelInformacoes';
import { PesquisasRecentes } from '@/components/search/PesquisasRecentes';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/contexts/AuthContext';
import { useRedeDoObjeto } from '@/hooks/useRedeDoObjeto';
import { useFavoritos } from '@/hooks/useFavoritos';
import { registrarPesquisaRecente } from '@/services/searchService';
import type { SearchResult } from '@/types';

export function Home() {
  const { session } = useAuth();
  const {
    selectedResult,
    setSelectedResult,
    redeAtiva,
    ativarRede,
    layerVisibility,
    toggleLayer,
    setObjetoSelecionado,
  } = useAppStore();

  const { data: redeObjetos = [] } = useRedeDoObjeto(redeAtiva.ativo ? redeAtiva.kmzId : null);
  const { data: favoritos, toggleFavorito } = useFavoritos();

  function handleSelecionarResultado(resultado: SearchResult) {
    setSelectedResult(resultado);
    if (session) registrarPesquisaRecente(session.user.id, resultado.codigo ?? '', resultado.id);
  }

  const jaFavoritado = !!favoritos?.some((f) => f.geo_object_id === selectedResult?.id);

  return (
    <div className="flex h-screen flex-col">
      <Header onSelecionarResultado={handleSelecionarResultado} />

      <div className="grid flex-1 grid-cols-1 gap-3 overflow-hidden p-3 md:grid-cols-[340px_1fr]">
        <div className="flex flex-col gap-3 overflow-auto">
          <PainelInformacoes
            resultado={selectedResult}
            favoritado={jaFavoritado}
            onFavoritar={() => {
              if (selectedResult && session) {
                toggleFavorito.mutate({ geoObjectId: selectedResult.id, jaFavoritado });
              }
            }}
            onVerRede={() => selectedResult && ativarRede(selectedResult.kmz_id)}
          />
          <PesquisasRecentes onSelecionar={handleSelecionarResultado} />
        </div>

        <div className="relative overflow-hidden rounded-lg border border-border">
          <MapaPrincipal
            destaque={selectedResult}
            redeObjetos={redeObjetos}
            layerVisibility={layerVisibility}
            onSelecionarObjeto={setObjetoSelecionado}
          />
          <ControleCamadas layers={layerVisibility} onToggle={toggleLayer} />
        </div>
      </div>
    </div>
  );
}
