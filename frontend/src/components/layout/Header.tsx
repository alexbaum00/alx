import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, Menu, Settings } from 'lucide-react';
import { api, type EstadoAcesso } from '@/lib/api';
import { CHAVE_ACESSO } from '@/components/acesso/Acesso';
import { BuscaGlobal } from './BuscaGlobal';

function Relogio() {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="hidden text-right text-sm leading-tight sm:block">
      <p className="text-texto">{agora.toLocaleDateString('pt-BR')}</p>
      <p className="text-suave">{agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
    </div>
  );
}

export function Header({ onAbrirMenu }: { onAbrirMenu: () => void }) {
  const qc = useQueryClient();
  const sair = async () => {
    await api('/auth/sair', { method: 'POST' }).catch(() => undefined);
    // limpa os dados em memória para não aparecerem na tela de login
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== CHAVE_ACESSO[0] });
    qc.setQueryData<EstadoAcesso>(CHAVE_ACESSO, (e) => (e ? { ...e, autenticado: false } : e));
  };
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-slate-950/20 px-4 py-3 backdrop-blur-xl lg:px-6">
      <button onClick={onAbrirMenu} className="rounded-lg p-2 text-suave hover:bg-card-hover lg:hidden" aria-label="Abrir menu">
        <Menu className="size-6" />
      </button>
      <BuscaGlobal />
      <div className="ml-auto flex items-center gap-3">
        <Relogio />
        <Link to="/configuracoes" className="rounded-lg border border-borda bg-card p-2 text-suave hover:text-white" aria-label="Configurações">
          <Settings className="size-5" />
        </Link>
        <button onClick={sair} className="rounded-lg border border-borda bg-card p-2 text-suave hover:text-white" aria-label="Sair" title="Sair">
          <LogOut className="size-5" />
        </button>
      </div>
    </header>
  );
}
