import { Moon, Sun, Settings, LogOut, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BarraPesquisa } from '@/components/search/BarraPesquisa';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/contexts/AuthContext';
import type { SearchResult } from '@/types';

interface HeaderProps {
  onSelecionarResultado: (r: SearchResult) => void;
}

export function Header({ onSelecionarResultado }: HeaderProps) {
  const { theme, toggleTheme } = useAppStore();
  const { profile, isAdmin, signOut } = useAuth();

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-card px-4">
      <div className="flex items-center gap-2 font-semibold">
        <Zap className="h-5 w-5 text-primary" />
        <span className="hidden sm:inline">Leste Localiza PRO</span>
      </div>

      <div className="flex flex-1 justify-center">
        <BarraPesquisa onSelecionar={onSelecionarResultado} />
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={toggleTheme} title="Alternar tema">
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>

        {isAdmin && (
          <Link to="/admin">
            <Button variant="ghost" size="icon" title="Painel administrativo">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        )}

        <div className="hidden text-right text-xs leading-tight md:block">
          <p className="font-medium">{profile?.nome}</p>
          <p className="text-muted-foreground">{isAdmin ? 'Administrador' : 'Usuário'}</p>
        </div>

        <Button variant="ghost" size="icon" onClick={() => signOut()} title="Sair">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
