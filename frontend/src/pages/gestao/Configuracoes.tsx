import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HardDriveDownload, KeyRound, Pencil, Plus, Radio as IconeRadio, Save, Smartphone, Trash2, X } from 'lucide-react';
import { api, ApiError, type Empresa, type Radio } from '@/lib/api';
import { CHAVE_RADIOS } from '@/components/layout/PlayerRadio';
import { Confirmar } from '@/components/ui/Confirmar';
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Radios />
        <AcessoCelular />
        <Backups />
        <TrocarSenha />
      </div>
    </div>
  );
}

function AcessoCelular() {
  const { data } = useQuery({
    queryKey: ['sistema', 'acesso'],
    queryFn: () => api<{ enderecos: { url: string; qrSvg: string }[] }>('/sistema/acesso'),
  });
  return (
    <Card className="p-4">
      <h2 className="mb-2 flex items-center gap-2 font-semibold text-white">
        <Smartphone className="size-4 text-laranja" /> Acesso pelo celular
      </h2>
      <p className="mb-3 text-sm text-suave">Com o celular no mesmo Wi-Fi, aponte a câmera para o código ou digite o endereço.</p>
      {data?.enderecos.length ? (
        <div className="flex flex-wrap gap-4">
          {data.enderecos.map((e) => (
            <div key={e.url} className="flex flex-col items-center gap-2">
              {/* SVG gerado no servidor pela biblioteca qrcode a partir do próprio endereço */}
              <div className="size-36 rounded-lg bg-white p-1" dangerouslySetInnerHTML={{ __html: e.qrSvg }} />
              <code className="text-xs text-texto">{e.url}</code>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-apagado">Nenhuma rede encontrada neste computador.</p>
      )}
      <p className="mt-3 text-xs text-apagado">
        Se o endereço mudar depois de reiniciar o roteador, reserve um IP fixo para este computador nas configurações do roteador.
      </p>
    </Card>
  );
}

interface InfoBackup {
  pasta: string;
  automatico: boolean;
  manter: number;
  ultimos: { arquivo: string; tamanhoBytes: number; data: string }[];
}

function Backups() {
  const qc = useQueryClient();
  const avisar = useAviso();
  const { data } = useQuery({ queryKey: ['sistema', 'backup'], queryFn: () => api<InfoBackup>('/sistema/backup') });
  const agora = useMutation({
    mutationFn: () => api<{ caminho: string }>('/sistema/backup', { method: 'POST' }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['sistema', 'backup'] });
      avisar(`Backup salvo em ${r.caminho}`);
    },
    onError: (e) => avisar(e.message, 'erro'),
  });
  return (
    <Card className="p-4">
      <h2 className="mb-2 flex items-center gap-2 font-semibold text-white">
        <HardDriveDownload className="size-4 text-laranja" /> Backup
      </h2>
      <p className="mb-3 text-sm text-suave">
        {data?.automatico ? `Automático, uma vez por dia; guarda os últimos ${data.manter}.` : 'Backup automático desligado.'}{' '}
        Copie a pasta para um pen drive de vez em quando, ou aponte-a para o Google Drive no arquivo <code className="text-texto">backend/.env</code>.
      </p>
      {data && <p className="mb-2 truncate text-xs text-apagado" title={data.pasta}>Pasta: {data.pasta}</p>}
      <ul className="mb-3 space-y-1 text-sm">
        {data?.ultimos.length ? (
          data.ultimos.map((b) => (
            <li key={b.arquivo} className="flex justify-between gap-2">
              <span className="text-texto">{new Date(b.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
              <span className="text-apagado">{(b.tamanhoBytes / 1024).toFixed(0)} KB</span>
            </li>
          ))
        ) : (
          <li className="text-apagado">Nenhum backup ainda.</li>
        )}
      </ul>
      <Botao variante="secundario" carregando={agora.isPending} onClick={() => agora.mutate()}>
        Fazer backup agora
      </Botao>
    </Card>
  );
}

function TrocarSenha() {
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const avisar = useAviso();
  const trocar = useMutation({
    mutationFn: () => api('/auth/trocar-senha', { method: 'POST', body: JSON.stringify({ atual, nova }) }),
    onSuccess: () => {
      setAtual('');
      setNova('');
      setConfirmacao('');
      avisar('Senha trocada. Os outros aparelhos vão pedir a senha nova.');
    },
    onError: (e) => avisar(e.message, 'erro'),
  });
  return (
    <Card className="p-4 md:col-span-2">
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-white">
        <KeyRound className="size-4 text-laranja" /> Trocar senha
      </h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (nova.length < 4) return avisar('A nova senha precisa de pelo menos 4 caracteres.', 'erro');
          if (nova !== confirmacao) return avisar('As senhas novas não conferem.', 'erro');
          trocar.mutate();
        }}
        className="grid grid-cols-1 items-end gap-4 sm:grid-cols-4"
      >
        <Campo rotulo="Senha atual">
          <Input type="password" autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} />
        </Campo>
        <Campo rotulo="Nova senha">
          <Input type="password" autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} />
        </Campo>
        <Campo rotulo="Repita a nova senha">
          <Input type="password" autoComplete="new-password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
        </Campo>
        <Botao type="submit" carregando={trocar.isPending} disabled={!atual || !nova}>
          Trocar senha
        </Botao>
      </form>
      <p className="mt-2 text-xs text-apagado">Ao trocar, todos os outros aparelhos conectados saem e precisam da senha nova.</p>
    </Card>
  );
}

const radioVazia = { nome: '', descricao: '', url: '', tocarAoAbrir: false };

function Radios() {
  const qc = useQueryClient();
  const avisar = useAviso();
  const { data: radios = [] } = useQuery({ queryKey: CHAVE_RADIOS, queryFn: () => api<Radio[]>('/radios') });
  const [form, setForm] = useState(radioVazia);
  const [editando, setEditando] = useState<number | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [excluir, setExcluir] = useState<Radio | null>(null);

  const limpar = () => {
    setForm(radioVazia);
    setEditando(null);
    setErros({});
  };
  const atualizarLista = () => qc.invalidateQueries({ queryKey: CHAVE_RADIOS });

  const salvar = useMutation({
    mutationFn: () =>
      api<Radio>(editando ? `/radios/${editando}` : '/radios', { method: editando ? 'PUT' : 'POST', body: JSON.stringify(form) }),
    onSuccess: () => {
      atualizarLista();
      avisar(editando ? 'Rádio atualizada.' : 'Rádio adicionada. Ela já aparece no player do topo.');
      limpar();
    },
    onError: (e) => {
      if (e instanceof ApiError && e.campos) setErros(Object.fromEntries(e.campos.map((c) => [c.campo, c.mensagem])));
      avisar(e.message, 'erro');
    },
  });

  const marcarAoAbrir = useMutation({
    mutationFn: (r: Radio) => api<Radio>(`/radios/${r.id}`, { method: 'PUT', body: JSON.stringify({ tocarAoAbrir: !r.tocarAoAbrir }) }),
    onSuccess: atualizarLista,
    onError: (e) => avisar(e.message, 'erro'),
  });

  const remover = useMutation({
    mutationFn: (id: number) => api(`/radios/${id}`, { method: 'DELETE' }),
    onSuccess: (_, id) => {
      atualizarLista();
      if (editando === id) limpar();
      setExcluir(null);
      avisar('Rádio removida.');
    },
    onError: (e) => avisar(e.message, 'erro'),
  });

  return (
    <Card className="p-4 md:col-span-2">
      <h2 className="mb-1 flex items-center gap-2 font-semibold text-white">
        <IconeRadio className="size-4 text-laranja" /> Rádios
      </h2>
      <p className="mb-4 text-sm text-suave">
        Aparecem no player do topo, ao lado da busca (só no computador). Use o link direto da transmissão ao vivo, não o endereço do site da rádio.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          salvar.mutate();
        }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-6"
      >
        <Campo rotulo="Nome" erro={erros.nome} className="sm:col-span-2" htmlFor="radio-nome">
          <Input id="radio-nome" value={form.nome} placeholder="Rádio ALX FM" onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </Campo>
        <Campo rotulo="Descrição (opcional)" erro={erros.descricao} className="sm:col-span-4" htmlFor="radio-descricao">
          <Input id="radio-descricao" value={form.descricao} placeholder="Rádio Rock FM" onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        </Campo>
        <Campo
          rotulo="Link da transmissão ao vivo"
          erro={erros.url}
          ajuda="Costuma terminar em .mp3, .aac, /stream ou /live. Links .m3u8 e páginas de site não tocam."
          className="sm:col-span-6"
          htmlFor="radio-url"
        >
          <Input id="radio-url" value={form.url} placeholder="https://…" inputMode="url" onChange={(e) => setForm({ ...form, url: e.target.value })} />
        </Campo>
        <label className="flex items-center gap-2 text-sm text-texto sm:col-span-4">
          <input type="checkbox" checked={form.tocarAoAbrir} onChange={(e) => setForm({ ...form, tocarAoAbrir: e.target.checked })} className="size-4 accent-orange-500" />
          Tocar quando abrir o programa
        </label>
        <div className="flex justify-end gap-2 sm:col-span-2">
          {editando && (
            <Botao variante="secundario" icone={<X className="size-4" />} onClick={limpar}>
              Cancelar
            </Botao>
          )}
          <Botao type="submit" icone={editando ? <Save className="size-4" /> : <Plus className="size-4" />} carregando={salvar.isPending}>
            {editando ? 'Salvar' : 'Adicionar'}
          </Botao>
        </div>
      </form>

      {radios.length > 0 && (
        <ul className="mt-5 divide-y divide-borda border-t border-borda">
          {radios.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {r.nome}
                  {r.descricao && <span className="ml-2 font-normal text-laranja">{r.descricao}</span>}
                </p>
                <p className="truncate text-xs text-apagado" title={r.url}>
                  {r.url}
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs text-suave">
                <input
                  type="checkbox"
                  checked={r.tocarAoAbrir}
                  disabled={marcarAoAbrir.isPending}
                  onChange={() => marcarAoAbrir.mutate(r)}
                  className="size-4 accent-orange-500"
                />
                Tocar ao abrir
              </label>
              <Botao
                variante="fantasma"
                tamanho="sm"
                icone={<Pencil className="size-3.5" />}
                onClick={() => {
                  setEditando(r.id);
                  setErros({});
                  setForm({ nome: r.nome, descricao: r.descricao ?? '', url: r.url, tocarAoAbrir: r.tocarAoAbrir });
                }}
              >
                Editar
              </Botao>
              <Botao variante="fantasma" tamanho="sm" icone={<Trash2 className="size-3.5" />} onClick={() => setExcluir(r)} aria-label={`Excluir ${r.nome}`}>
                Excluir
              </Botao>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-apagado">
        Só uma rádio toca ao abrir. Se o navegador bloquear o som na abertura, a rádio começa no primeiro clique ou tecla.
      </p>

      <Confirmar
        aberto={excluir !== null}
        titulo="Excluir rádio"
        mensagem={`Remover “${excluir?.nome ?? ''}” do player?`}
        textoConfirmar="Excluir"
        perigo
        carregando={remover.isPending}
        onConfirmar={() => excluir && remover.mutate(excluir.id)}
        onCancelar={() => setExcluir(null)}
      />
    </Card>
  );
}
