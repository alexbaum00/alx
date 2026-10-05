import type { ReactNode } from 'react';
import { Search } from 'lucide-react';

export function CabecalhoPagina({ titulo, subtitulo, acoes }: { titulo: string; subtitulo?: string; acoes?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-white">{titulo}</h1>
        {subtitulo && <p className="text-sm text-suave">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}

export function CampoBusca({ valor, onChange, placeholder }: { valor: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-apagado" />
      <input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-borda bg-card pr-3 pl-9 text-base text-texto placeholder:text-apagado focus:border-laranja/60 focus:ring-2 focus:ring-laranja/20 focus:outline-none sm:h-10 sm:text-sm"
      />
    </div>
  );
}

export const thTabela = 'px-4 py-2.5 text-left text-xs font-medium text-suave whitespace-nowrap';
export const tdTabela = 'px-4 py-3 text-sm';
