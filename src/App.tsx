import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { RotaProtegida } from '@/components/layout/RotaProtegida';
import { Home } from '@/pages/Home';
import { Login } from '@/pages/Login';
import { Admin } from '@/pages/Admin';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <RotaProtegida>
                  <Home />
                </RotaProtegida>
              }
            />
            <Route
              path="/admin"
              element={
                <RotaProtegida apenasAdmin>
                  <Admin />
                </RotaProtegida>
              }
            />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
