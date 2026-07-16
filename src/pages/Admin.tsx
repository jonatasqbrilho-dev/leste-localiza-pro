import { Header } from '@/components/layout/Header';
import { PainelAdmin } from '@/components/admin/PainelAdmin';

export function Admin() {
  return (
    <div className="flex h-screen flex-col overflow-auto">
      <Header onSelecionarResultado={() => {}} />
      <PainelAdmin />
    </div>
  );
}
