import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useSearch } from '@/hooks/useSearch';
import type { SearchResult } from '@/types';

interface BarraPesquisaProps {
  onSelecionar: (resultado: SearchResult) => void;
}

export function BarraPesquisa({ onSelecionar }: BarraPesquisaProps) {
  const [termo, setTermo] = useState('');
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: resultados, isFetching } = useSearch(termo);

  useEffect(() => {
    function fecharAoClicarFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener('mousedown', fecharAoClicarFora);
    return () => document.removeEventListener('mousedown', fecharAoClicarFora);
  }, []);

  return (
    <div ref={ref} className="relative w-full max-w-xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={termo}
          onChange={(e) => {
            setTermo(e.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          placeholder="Pesquisar CSI, poste, transformador, município..."
          className="pl-9 pr-9"
        />
        {termo && (
          <button
            onClick={() => setTermo('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {aberto && termo.trim().length >= 2 && (
        <Card className="absolute z-[1100] mt-1 max-h-80 w-full animate-slide-up overflow-auto p-1">
          {isFetching && <p className="p-3 text-sm text-muted-foreground">Buscando...</p>}
          {!isFetching && resultados?.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">Nenhum resultado encontrado.</p>
          )}
          {resultados?.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                onSelecionar(r);
                setAberto(false);
              }}
              className="flex w-full flex-col rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <span className="font-medium">{r.codigo ?? '(sem código)'}</span>
              <span className="text-xs text-muted-foreground">
                {[r.municipio, r.subestacao, r.alimentador].filter(Boolean).join(' · ')}
              </span>
            </button>
          ))}
        </Card>
      )}
    </div>
  );
}
