import type { LayerVisibility } from '@/types';
import { CORES_CATEGORIA } from './icones';
import { Card } from '@/components/ui/card';

const ROTULOS: Record<keyof LayerVisibility, string> = {
  poste: 'Postes',
  transformador: 'Transformadores',
  rede_mt: 'Rede MT',
  rede_bt: 'Rede BT',
  ramal: 'Ramais',
  chave: 'Chaves',
  religador: 'Religadores',
  consumidor: 'Consumidores',
  outro: 'Outros',
};

interface ControleCamadasProps {
  layers: LayerVisibility;
  onToggle: (layer: keyof LayerVisibility) => void;
}

export function ControleCamadas({ layers, onToggle }: ControleCamadasProps) {
  return (
    <Card className="absolute right-3 top-3 z-[1000] w-48 animate-fade-in p-3">
      <p className="mb-2 text-xs font-semibold text-muted-foreground">Camadas</p>
      <div className="flex flex-col gap-1.5">
        {(Object.keys(ROTULOS) as (keyof LayerVisibility)[]).map((chave) => (
          <label key={chave} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={layers[chave]}
              onChange={() => onToggle(chave)}
              className="h-3.5 w-3.5 accent-primary"
            />
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: CORES_CATEGORIA[chave as keyof typeof CORES_CATEGORIA] ?? '#6b7280' }}
            />
            {ROTULOS[chave]}
          </label>
        ))}
      </div>
    </Card>
  );
}
