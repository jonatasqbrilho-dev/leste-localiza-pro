import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LayerVisibility, SearchResult } from '@/types';
import { DEFAULT_LAYER_VISIBILITY } from '@/types';

interface AppState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  selectedResult: SearchResult | null;
  setSelectedResult: (r: SearchResult | null) => void;

  redeAtiva: { kmzId: string; ativo: boolean };
  ativarRede: (kmzId: string) => void;
  fecharRede: () => void;

  layerVisibility: LayerVisibility;
  toggleLayer: (layer: keyof LayerVisibility) => void;

  objetoSelecionado: string | null;
  setObjetoSelecionado: (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'light',
      toggleTheme: () =>
        set((s) => {
          const next = s.theme === 'light' ? 'dark' : 'light';
          document.documentElement.classList.toggle('dark', next === 'dark');
          return { theme: next };
        }),

      selectedResult: null,
      setSelectedResult: (r) => set({ selectedResult: r }),

      redeAtiva: { kmzId: '', ativo: false },
      ativarRede: (kmzId) => set({ redeAtiva: { kmzId, ativo: true } }),
      fecharRede: () => set({ redeAtiva: { kmzId: '', ativo: false } }),

      layerVisibility: DEFAULT_LAYER_VISIBILITY,
      toggleLayer: (layer) =>
        set((s) => ({ layerVisibility: { ...s.layerVisibility, [layer]: !s.layerVisibility[layer] } })),

      objetoSelecionado: null,
      setObjetoSelecionado: (id) => set({ objetoSelecionado: id }),
    }),
    { name: 'leste-localiza-store', partialize: (s) => ({ theme: s.theme, layerVisibility: s.layerVisibility }) }
  )
);
