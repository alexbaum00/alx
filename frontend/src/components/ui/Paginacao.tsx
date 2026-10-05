import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Paginacao({ pagina, porPagina, total, onMudar }: { pagina: number; porPagina: number; total: number; onMudar: (p: number) => void }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  if (paginas <= 1) return <p className="px-4 py-3 text-xs text-apagado">{total} registro{total === 1 ? '' : 's'}</p>;
  return (
    <div className="flex items-center justify-between px-4 py-3 text-xs text-apagado">
      <span>
        {total} registros · página {pagina} de {paginas}
      </span>
      <div className="flex gap-1">
        <button disabled={pagina <= 1} onClick={() => onMudar(pagina - 1)} className="rounded-md border border-borda p-1.5 text-suave hover:bg-card-hover disabled:opacity-40" aria-label="Página anterior">
          <ChevronLeft className="size-4" />
        </button>
        <button disabled={pagina >= paginas} onClick={() => onMudar(pagina + 1)} className="rounded-md border border-borda p-1.5 text-suave hover:bg-card-hover disabled:opacity-40" aria-label="Próxima página">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
