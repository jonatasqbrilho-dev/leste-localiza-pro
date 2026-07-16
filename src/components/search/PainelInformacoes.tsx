import { Navigation, MapPin, Copy, Share2, Star, Network } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { SearchResult } from '@/types';
import { toast } from 'sonner';

interface PainelInformacoesProps {
  resultado: SearchResult | null;
  favoritado: boolean;
  onFavoritar: () => void;
  onVerRede: () => void;
}

export function PainelInformacoes({ resultado, favoritado, onFavoritar, onVerRede }: PainelInformacoesProps) {
  if (!resultado) {
    return (
      <Card className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
        <MapPin className="h-8 w-8" />
        <p className="text-sm">Pesquise um CSI para ver os detalhes e localizá-lo no mapa.</p>
      </Card>
    );
  }

  const coordenadas = `${resultado.latitude?.toFixed(6)}, ${resultado.longitude?.toFixed(6)}`;

  function copiarCoordenadas() {
    navigator.clipboard.writeText(coordenadas);
    toast.success('Coordenadas copiadas');
  }

  function compartilhar() {
    const url = `${window.location.origin}/?csi=${resultado!.codigo ?? resultado!.id}`;
    if (navigator.share) {
      navigator.share({ title: resultado!.codigo ?? 'CSI', url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copiado');
    }
  }

  function abrirGoogleMaps() {
    window.open(`https://www.google.com/maps/search/?api=1&query=${resultado!.latitude},${resultado!.longitude}`, '_blank');
  }

  function tracarRota() {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${resultado!.latitude},${resultado!.longitude}`,
      '_blank'
    );
  }

  const camposPrincipais: Array<[string, string | null]> = [
    ['Código', resultado.codigo],
    ['Município', resultado.municipio],
    ['Regional', resultado.regional],
    ['Subestação', resultado.subestacao],
    ['Alimentador', resultado.alimentador],
    ['Coordenadas', coordenadas],
  ];

  const outrosAtributos = Object.entries(resultado.properties ?? {}).filter(
    ([chave]) => !['csi', 'codigo', 'código', 'municipio', 'município', 'subestacao', 'subestação', 'alimentador', 'regional'].includes(chave.toLowerCase())
  );

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="shrink-0 border-b border-border">
        <CardTitle className="text-base">{resultado.codigo ?? 'Objeto sem código'}</CardTitle>
        <p className="text-xs text-muted-foreground">{resultado.kmz_nome}</p>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto pt-4">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          {camposPrincipais
            .filter(([, valor]) => !!valor)
            .map(([rotulo, valor]) => (
              <div key={rotulo} className="col-span-2 flex justify-between gap-2 border-b border-border/60 pb-1 sm:col-span-1">
                <dt className="text-muted-foreground">{rotulo}</dt>
                <dd className="text-right font-medium">{valor}</dd>
              </div>
            ))}
        </dl>

        {outrosAtributos.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
              Todos os atributos do KMZ ({outrosAtributos.length})
            </summary>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              {outrosAtributos.map(([chave, valor]) => (
                <div key={chave} className="col-span-2 flex justify-between gap-2 sm:col-span-1">
                  <dt className="text-muted-foreground">{chave}</dt>
                  <dd className="text-right">{String(valor)}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" onClick={tracarRota}>
            <Navigation className="h-4 w-4" /> Rota
          </Button>
          <Button size="sm" variant="outline" onClick={abrirGoogleMaps}>
            <MapPin className="h-4 w-4" /> Google Maps
          </Button>
          <Button size="sm" variant="outline" onClick={copiarCoordenadas}>
            <Copy className="h-4 w-4" /> Copiar
          </Button>
          <Button size="sm" variant="outline" onClick={compartilhar}>
            <Share2 className="h-4 w-4" /> Compartilhar
          </Button>
          <Button size="sm" variant={favoritado ? 'default' : 'outline'} onClick={onFavoritar}>
            <Star className="h-4 w-4" /> {favoritado ? 'Favoritado' : 'Favoritar'}
          </Button>
          <Button size="sm" onClick={onVerRede}>
            <Network className="h-4 w-4" /> Ver Rede
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
