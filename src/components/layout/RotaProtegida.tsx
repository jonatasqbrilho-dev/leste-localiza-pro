import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function RotaProtegida({ children, apenasAdmin = false }: { children: ReactNode; apenasAdmin?: boolean }) {
  const { session, loading, isAdmin } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">Carregando...</div>;
  }
  if (!session) return <Navigate to="/login" replace />;
  if (apenasAdmin && !isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}
