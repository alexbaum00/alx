import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Lock, LockOpen, Monitor } from 'lucide-react';
import { api, EVENTO_SESSAO_EXPIRADA, type EstadoAcesso } from '@/lib/api';
import { Logo } from '@/components/layout/Logo';
import { FundoDesfocado } from '@/components/layout/Fundo';
import { Botao } from '@/components/ui/Botao';
import { Campo, Input } from '@/components/ui/Campos';
import { Carregando, Erro } from '@/components/ui/Estados';

export const CHAVE_ACESSO = ['acesso'];

// Mostra o sistema só depois do login; na primeira vez, pede para criar a senha.
export function PortaoAcesso({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data, isPending, error, refetch } = useQuery({
    queryKey: CHAVE_ACESSO,
    queryFn: () => api<EstadoAcesso>('/auth/estado'),
    staleTime: Infinity,
  });

  useEffect(() => {
    const expirou = () => {
      qc.setQueryData<EstadoAcesso>(CHAVE_ACESSO, (e) => (e ? { ...e, autenticado: false } : e));
    };
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, expirou);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, expirou);
  }, [qc]);

  if (isPending) return <Carregando texto="Abrindo…" />;
  if (error) return <Erro mensagem={`Não foi possível falar com o sistema: ${error.message}`} onTentar={() => refetch()} />;
  if (!data.senhaDefinida) return <CriarSenha local={data.acessoLocal} />;
  if (!data.autenticado) return <Entrar />;
  return <>{children}</>;
}

// Fundo escuro desfocado, cartão de vidro e o logo redondo "encaixado" no topo do cartão.
function Moldura({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh items-center justify-center px-4 py-10">
      <FundoDesfocado />

      <div className="relative mt-20 w-full max-w-md">
        <div className="absolute -top-20 left-1/2 z-10 -translate-x-1/2 rounded-full shadow-[0_0_28px_rgba(249,115,22,0.3),0_10px_30px_rgba(0,0,0,0.6)]">
          <Logo tamanho="size-40" escuro className="rounded-full" />
        </div>
        <div className="rounded-3xl border border-white/10 bg-slate-800/30 px-6 pt-24 pb-7 shadow-2xl shadow-black/50 backdrop-blur-xl sm:px-9">
          <h1 className="text-center text-xl font-semibold text-white">{titulo}</h1>
          <p className="mt-1 mb-6 text-center text-suave">{subtitulo}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

function CampoSenha({ rotulo, valor, onChange, autoFocus, autoComplete }: { rotulo: string; valor: string; onChange: (v: string) => void; autoFocus?: boolean; autoComplete: string }) {
  const [ver, setVer] = useState(false);
  const id = useId();
  return (
    <Campo rotulo={rotulo} htmlFor={id}>
      <div className="relative">
        <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-apagado" aria-hidden="true" />
        <Input
          id={id}
          type={ver ? 'text' : 'password'}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          className="h-12 border-white/10 bg-slate-950/60 pr-11 pl-10 sm:h-12"
        />
        <button type="button" onClick={() => setVer((v) => !v)} className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-apagado hover:text-white" aria-label={ver ? 'Esconder senha' : 'Mostrar senha'}>
          {ver ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </Campo>
  );
}

function useAposEntrar() {
  const qc = useQueryClient();
  return () => {
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== CHAVE_ACESSO[0] });
    qc.setQueryData<EstadoAcesso>(CHAVE_ACESSO, (e) => (e ? { ...e, senhaDefinida: true, autenticado: true } : e));
  };
}

function Entrar() {
  const [senha, setSenha] = useState('');
  const aposEntrar = useAposEntrar();
  const entrar = useMutation({
    mutationFn: () => api('/auth/entrar', { method: 'POST', body: JSON.stringify({ senha }) }),
    onSuccess: aposEntrar,
    onError: () => setSenha(''),
  });
  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (senha) entrar.mutate();
  };
  return (
    <Moldura titulo="Entrar" subtitulo="Digite a senha da oficina.">
      <form onSubmit={enviar} className="space-y-4">
        <CampoSenha rotulo="Senha" valor={senha} onChange={setSenha} autoFocus autoComplete="current-password" />
        {entrar.error && <p className="text-sm text-red-400">{entrar.error.message}</p>}
        <Botao type="submit" className="h-12 w-full text-base font-semibold" icone={<LockOpen className="size-4" />} carregando={entrar.isPending}>
          Entrar
        </Botao>
      </form>
      <p className="mt-6 text-center text-xs text-suave">Esqueceu? No computador da oficina, rode “npm run senha:redefinir”.</p>
    </Moldura>
  );
}

function CriarSenha({ local }: { local: boolean }) {
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const aposEntrar = useAposEntrar();
  const criar = useMutation({
    mutationFn: () => api('/auth/definir-senha', { method: 'POST', body: JSON.stringify({ senha }) }),
    onSuccess: aposEntrar,
    onError: (e) => setErro(e.message),
  });

  if (!local) {
    return (
      <Moldura titulo="Sistema ainda sem senha" subtitulo="Por segurança, a senha é criada no computador da oficina.">
        <div className="flex flex-col items-center gap-3 text-center text-sm text-suave">
          <Monitor className="size-10 text-laranja" />
          <p>
            No computador onde o sistema está instalado, abra <code className="text-texto">http://localhost:3000</code> e crie a senha. Depois é só voltar aqui.
          </p>
        </div>
      </Moldura>
    );
  }

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (senha.length < 4) return setErro('Use pelo menos 4 caracteres.');
    if (senha !== confirmacao) return setErro('As senhas não conferem.');
    setErro('');
    criar.mutate();
  };

  return (
    <Moldura titulo="Bem-vindo!" subtitulo="Crie a senha que será pedida no computador e no celular.">
      <form onSubmit={enviar} className="space-y-4">
        <CampoSenha rotulo="Nova senha" valor={senha} onChange={setSenha} autoFocus autoComplete="new-password" />
        <CampoSenha rotulo="Repita a senha" valor={confirmacao} onChange={setConfirmacao} autoComplete="new-password" />
        <p className="text-xs text-apagado">Pode ser um PIN de 4 ou mais números, mas uma frase curta é mais segura.</p>
        {erro && <p className="text-sm text-red-400">{erro}</p>}
        <Botao type="submit" className="h-12 w-full text-base font-semibold" carregando={criar.isPending}>
          Criar senha e entrar
        </Botao>
      </form>
    </Moldura>
  );
}
