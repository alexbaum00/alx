import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// No celular abre como painel de baixo para cima, ocupando a tela; no computador, centralizado.
export function Modal({ aberto, onFechar, titulo, children, rodape, largura = 'max-w-2xl' }: {
  aberto: boolean;
  onFechar: () => void;
  titulo: string;
  children: ReactNode;
  rodape?: ReactNode;
  largura?: string;
}) {
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar();
    document.addEventListener('keydown', esc);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = overflow;
    };
  }, [aberto, onFechar]);

  if (!aberto) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div role="dialog" aria-modal="true" aria-label={titulo} className={`flex max-h-[92dvh] w-full ${largura} flex-col rounded-t-2xl border border-borda bg-painel shadow-2xl sm:rounded-2xl`}>
        <header className="flex items-center justify-between border-b border-borda px-5 py-4">
          <h2 className="text-lg font-semibold text-white">{titulo}</h2>
          <button onClick={onFechar} className="rounded-md p-1.5 text-suave hover:bg-card-hover hover:text-white" aria-label="Fechar">
            <X className="size-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {rodape && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-borda px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{rodape}</footer>}
      </div>
    </div>,
    document.body,
  );
}
