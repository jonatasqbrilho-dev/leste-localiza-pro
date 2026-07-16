import { useQuery } from '@tanstack/react-query';
import { buscarObjetos } from '@/services/searchService';

export function useSearch(termo: string) {
  return useQuery({
    queryKey: ['busca', termo],
    queryFn: () => buscarObjetos(termo),
    enabled: termo.trim().length >= 2,
    staleTime: 30_000,
  });
}
