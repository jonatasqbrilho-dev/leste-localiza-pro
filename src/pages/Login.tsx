import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const { error } = await signIn(email, senha);
    setCarregando(false);
    if (error) {
      setErro('E-mail ou senha inválidos.');
      return;
    }
    navigate('/');
  }

  return (
    <div className="flex h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm animate-slide-up">
        <CardHeader className="items-center text-center">
          <Zap className="mb-2 h-8 w-8 text-primary" />
          <CardTitle className="text-lg">Leste Localiza PRO</CardTitle>
          <p className="text-xs text-muted-foreground">Consulta de rede elétrica</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} required />
            {erro && <p className="text-xs text-destructive">{erro}</p>}
            <Button type="submit" disabled={carregando} className="mt-1">
              {carregando ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
