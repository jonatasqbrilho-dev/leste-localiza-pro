import { useQuery } from '@tanstack/react-query';
import { carregarRedePorKmz } from '@/services/searchService';

/** Carrega somente o KMZ ativo — nunca todos simultaneamente. */
export function useRedeDoObjeto(kmzId: string | null) {
  return useQuery({
    queryKey: ['rede', kmzId],
    queryFn: () => carregarRedePorKmz(kmzId as string),
    enabled: !!kmzId,
    staleTime: 5 * 60_000,
  });
}
