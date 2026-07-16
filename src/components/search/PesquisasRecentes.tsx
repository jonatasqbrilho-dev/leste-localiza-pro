import { Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { listarPesquisasRecentes } from '@/services/searchService';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import type { SearchResult } from '@/types';

interface PesquisasRecentesProps {
  onSelecionar: (r: SearchResult) => void;
}

export function PesquisasRecentes({ onSelecionar }: PesquisasRecentesProps) {
  const { session } = useAuth();
  const { data } = useQuery({
    queryKey: ['pesquisas-recentes', session?.user.id],
    queryFn: () => listarPesquisasRecentes(session!.user.id),
    enabled: !!session,
  });

  if (!data || data.length === 0) return null;

  return (
    <Card className="p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Clock className="h-3.5 w-3.5" /> Últimas pesquisas
      </p>
      <div className="flex flex-wrap gap-1.5">
        {data.map((p) =>
          p.geo_object ? (
            <button
              key={p.id}
              onClick={() => onSelecionar({ ...(p.geo_object as any), kmz_nome: '' })}
              className="rounded-full border border-border px-2.5 py-1 text-xs hover:bg-muted"
            >
              {p.termo}
            </button>
          ) : null
        )}
      </div>
    </Card>
  );
}
