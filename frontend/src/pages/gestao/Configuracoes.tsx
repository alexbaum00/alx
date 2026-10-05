import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HardDriveDownload, Save, Smartphone } from 'lucide-react';
import { api, ApiError, type Empresa } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Botao } from '@/components/ui/Botao';
import { Campo, Input } from '@/components/ui/Campos';
import { Carregando, Erro } from '@/components/ui/Estados';
import { CabecalhoPagina } from '@/components/ui/Pagina';
import { useAviso } from '@/components/ui/Toast';

const campos: { nome: keyof Empresa; rotulo: string; classe?: string; placeholder?: string; ajuda?: string }[] = [
  { nome: 'nomeFantasia', rotulo: 'Nome da oficina', classe: 'sm:col-span-3' },
  { nome: 'razaoSocial', rotulo: 'Razão social', classe: 'sm:col-span-3' },
  { nome: 'cnpj', rotulo: 'CNPJ (MEI)', classe: 'sm:col-span-2' },
  { nome: 'telefone', rotulo: 'Telefone / WhatsApp', classe: 'sm:col-span-2' },
  { nome: 'email', rotulo: 'E-mail', classe: 'sm:col-span-2' },
  { nome: 'cep', rotulo: 'CEP', classe: 'sm:col-span-2' },
  { nome: 'endereco', rotulo: 'Endereço', classe: 'sm:col-span-3' },
  { nome: 'numero', rotulo: 'Número', classe: 'sm:col-span-1' },
  { nome: 'bairro', rotulo: 'Bairro', classe: 'sm:col-span-2' },
  { nome: 'cidade', rotulo: 'Cidade', classe: 'sm:col-span-3' },
  { nome: 'uf', rotulo: 'UF', classe: 'sm:col-span-1' },
  {
    nome: 'urlEmissorNfe',
    rotulo: 'Link do emissor de NF-e (peças)',
    classe: 'sm:col-span-6',
    placeholder: 'https://…',
    ajuda: 'Varia por estado (ex.: portal da SEFAZ ou app Nota Fiscal Fácil). Aparece como botão na tela da venda.',
  },
];

export function Configuracoes() {
  const { data, isPending, error } = useQuery({ queryKey: ['empresa'], queryFn: () => api<Empresa>('/empresa') });
  const [valores, setValores] = useState<Record<string, string>>({});
  const [erros, setErros] = useState<Record<string, string>>({});
  const qc = useQueryClient();
  const avisar = useAviso();

  useEffect(() => {
    if (data) setValores(Object.fromEntries(campos.map((c) => [c.nome, data[c.nome] ?? ''])));
  }, [data]);

  const salvar = useMutation({
    mutationFn: () => api<Empresa>('/empresa', { method: 'PUT', body: JSON.stringify(valores) }),
    onSuccess: (e) => {
      qc.setQueryData(['empresa'], e);
      setErros({});
      avisar('Configurações salvas.');
    },
    onError: (e) => {
      if (e instanceof ApiError && e.campos) setErros(Object.fromEntries(e.campos.map((c) => [c.campo, c.mensagem])));
      avisar(e.message, 'erro');
    },
  });

  if (isPending) return <Carregando />;
  if (error) return <Erro mensagem={error.message} />;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <CabecalhoPagina titulo="Configurações" subtitulo="Dados da oficina usados na nota fiscal e nas mensagens aos clientes." />
      <Card className="p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            salvar.mutate();
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-6"
        >
          {campos.map((c) => (
            <Campo key={c.nome} rotulo={c.rotulo} erro={erros[c.nome]} ajuda={c.ajuda} className={c.classe} htmlFor={`cfg-${c.nome}`}>
              <Input
                id={`cfg-${c.nome}`}
                value={valores[c.nome] ?? ''}
                placeholder={c.placeholder}
                maxLength={c.nome === 'uf' ? 2 : undefined}
                onChange={(e) => setValores({ ...valores, [c.nome]: c.nome === 'uf' ? e.target.value.toUpperCase() : e.target.value })}
              />
            </Campo>
          ))}
          <div className="flex justify-end sm:col-span-6">
            <Botao type="submit" icone={<Save className="size-4" />} carregando={salvar.isPending}>
              Salvar
            </Botao>
          </div>
        </form>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-2 flex items-center gap-2 font-semibold text-white">
            <Smartphone className="size-4 text-laranja" /> Acesso pelo celular
          </h2>
          <p className="text-sm text-suave">
            Com o celular no mesmo Wi-Fi, abra o endereço que aparece no computador ao iniciar o sistema (algo como <code className="text-texto">http://192.168.1.10:3000</code>). Você está acessando agora por{' '}
            <code className="text-texto">{window.location.host}</code>.
          </p>
        </Card>
        <Card className="p-4">
          <h2 className="mb-2 flex items-center gap-2 font-semibold text-white">
            <HardDriveDownload className="size-4 text-laranja" /> Backup
          </h2>
          <p className="text-sm text-suave">
            No computador, rode <code className="text-texto">npm run db:backup</code>. Uma cópia datada do banco vai para a pasta <code className="text-texto">backups/</code>; guarde-a num pen drive ou no Google Drive.
          </p>
        </Card>
      </div>
    </div>
  );
}
