import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { Car, ChevronDown, X } from 'lucide-react';
import { Logo } from './Logo';
import { menu, type ItemMenu } from './menu';

const base = 'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors';
const ativo = 'bg-laranja-escuro text-white shadow-lg shadow-orange-950/40';
const inativo = 'text-slate-200 hover:bg-white/5 hover:text-white';

function ItemComFilhos({ item, onNavegar }: { item: ItemMenu; onNavegar: () => void }) {
  const { pathname } = useLocation();
  const dentro = pathname.startsWith(item.para);
  const [aberto, setAberto] = useState(dentro);
  useEffect(() => {
    if (dentro) setAberto(true);
  }, [dentro]);
  const Icone = item.icone;

  return (
    <li>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className={`${base} ${dentro && !aberto ? ativo : inativo}`}
      >
        <Icone className="size-5 shrink-0" />
        <span className="flex-1 text-left">{item.rotulo}</span>
        <ChevronDown className={`size-4 transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>
      {aberto && (
        <ul className="mt-1 ml-5 space-y-0.5 border-l border-white/10 pl-3">
          {item.filhos!.map((f) => (
            <li key={f.para}>
              <NavLink
                to={f.para}
                onClick={onNavegar}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm ${isActive ? 'bg-laranja-escuro/90 text-white' : inativo}`
                }
              >
                <f.icone className="size-4" />
                {f.rotulo}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function Sidebar({ aberta, onFechar }: { aberta: boolean; onFechar: () => void }) {
  return (
    <>
      {/* fundo escuro atrás do menu no celular */}
      <div
        onClick={onFechar}
        className={`fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden ${aberta ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/10 bg-painel/95 backdrop-blur-xl transition-transform lg:sticky lg:bg-slate-950/25 lg:top-0 lg:h-screen lg:translate-x-0 ${aberta ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="relative flex justify-center px-4 pt-5 pb-4">
          <span className="rounded-full shadow-[0_0_24px_rgba(249,115,22,0.25),0_8px_24px_rgba(0,0,0,0.5)]">
            <Logo tamanho="size-32" escuro className="rounded-full" />
          </span>
          <button onClick={onFechar} className="absolute top-3 right-3 rounded-md p-1.5 text-suave hover:bg-card-hover lg:hidden" aria-label="Fechar menu">
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3">
          <ul className="space-y-1">
            {menu.map((item) =>
              item.filhos ? (
                <ItemComFilhos key={item.para} item={item} onNavegar={onFechar} />
              ) : (
                <li key={item.para}>
                  <NavLink to={item.para} end={item.para === '/'} onClick={onFechar} className={({ isActive }) => `${base} ${isActive ? ativo : inativo}`}>
                    <item.icone className="size-5 shrink-0" />
                    {item.rotulo}
                  </NavLink>
                </li>
              ),
            )}
          </ul>
        </nav>

        <div className="flex flex-col items-center gap-1 px-4 py-5 text-center">
          <Car className="size-9 text-sky-400/70" strokeWidth={1.5} />
          <p className="text-sm font-semibold text-white">ALX</p>
          <p className="text-xs text-suave">Serviços Automotivos</p>
          <p className="text-[10px] text-apagado">Auto Elétrica • Acessórios • Chaves</p>
        </div>
      </aside>
    </>
  );
}
