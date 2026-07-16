import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listarFavoritos, favoritar, desfavoritar } from '@/services/favoritosService';
import { useAuth } from '@/contexts/AuthContext';

export function useFavoritos() {
  const { session } = useAuth();
  const usuarioId = session?.user.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['favoritos', usuarioId],
    queryFn: () => listarFavoritos(usuarioId as string),
    enabled: !!usuarioId,
  });

  const toggleFavorito = useMutation({
    mutationFn: async ({ geoObjectId, jaFavoritado }: { geoObjectId: string; jaFavoritado: boolean }) => {
      if (!usuarioId) return;
      if (jaFavoritado) await desfavoritar(usuarioId, geoObjectId);
      else await favoritar(usuarioId, geoObjectId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favoritos', usuarioId] }),
  });

  return { ...query, toggleFavorito };
}
