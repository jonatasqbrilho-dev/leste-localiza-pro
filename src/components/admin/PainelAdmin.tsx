import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Trash2, FileArchive, Users as UsersIcon, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { importarKmz, listarKmzFiles, excluirKmz, type ProgressoImportacao } from '@/services/kmzImportService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const ETAPAS_LABEL: Record<ProgressoImportacao['etapa'], string> = {
  lendo: 'Lendo KMZ...',
  convertendo: 'Convertendo para GeoJSON...',
  enviando_storage: 'Enviando arquivo original...',
  salvando_objetos: 'Salvando objetos no banco...',
  concluido: 'Concluído',
  erro: 'Erro',
};

export function PainelAdmin() {
  const { session } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progresso, setProgresso] = useState<ProgressoImportacao | null>(null);
  const queryClient = useQueryClient();

  const { data: kmzFiles } = useQuery({ queryKey: ['kmz-files'], queryFn: listarKmzFiles });

  const importMutation = useMutation({
    mutationFn: (arquivo: File) => importarKmz(arquivo, session!.user.id, setProgresso),
    onSuccess: (resultado) => {
      toast.success(`KMZ importado: ${resultado.totalObjetos} objetos salvos`);
      queryClient.invalidateQueries({ queryKey: ['kmz-files'] });
      setProgresso(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Erro ao importar KMZ');
    },
  });

  const excluirMutation = useMutation({
    mutationFn: ({ id, storagePath }: { id: string; storagePath: string }) => excluirKmz(id, storagePath),
    onSuccess: () => {
      toast.success('KMZ excluído');
      queryClient.invalidateQueries({ queryKey: ['kmz-files'] });
    },
  });

  function handleArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (arquivo) importMutation.mutate(arquivo);
    e.target.value = '';
  }

  const percentual = progresso && progresso.totalObjetos > 0 ? Math.round((progresso.objetosProcessados / progresso.totalObjetos) * 100) : 0;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">Painel Administrativo</h1>

      <Card>
        <CardHeader>
          <CardTitle>Importar KMZ</CardTitle>
        </CardHeader>
        <CardContent>
          <input ref={inputRef} type="file" accept=".kmz" className="hidden" onChange={handleArquivoSelecionado} />
          <Button onClick={() => inputRef.current?.click()} disabled={importMutation.isPending}>
            <Upload className="h-4 w-4" /> Adicionar KMZ
          </Button>

          {progresso && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">
                {ETAPAS_LABEL[progresso.etapa]}
                {progresso.totalObjetos > 0 && ` — ${progresso.objetosProcessados}/${progresso.totalObjetos}`}
              </p>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${percentual}%` }} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileArchive className="h-4 w-4" /> Arquivos KMZ ({kmzFiles?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {kmzFiles?.map((kmz) => (
            <div key={kmz.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
              <div>
                <p className="font-medium">{kmz.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {kmz.total_objetos} objetos · {kmz.status} · {new Date(kmz.data_upload).toLocaleString('pt-BR')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => excluirMutation.mutate({ id: kmz.id, storagePath: kmz.storage_path })}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          {kmzFiles?.length === 0 && <p className="text-sm text-muted-foreground">Nenhum KMZ importado ainda.</p>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-4 w-4" /> Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Gestão de usuários e perfis (admin/usuário).</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-4 w-4" /> Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Auditoria de importações, exclusões e acessos.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
