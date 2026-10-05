import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Menu, Settings } from 'lucide-react';
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
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-borda bg-fundo/90 px-4 py-3 backdrop-blur lg:px-6">
      <button onClick={onAbrirMenu} className="rounded-lg p-2 text-suave hover:bg-card-hover lg:hidden" aria-label="Abrir menu">
        <Menu className="size-6" />
      </button>
      <BuscaGlobal />
      <div className="ml-auto flex items-center gap-3">
        <Relogio />
        <Link to="/configuracoes" className="rounded-lg border border-borda bg-card p-2 text-suave hover:text-white" aria-label="Configurações">
          <Settings className="size-5" />
        </Link>
      </div>
    </header>
  );
}
