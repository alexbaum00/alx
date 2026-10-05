import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface Mes {
  ano: number;
  mes: number; // 0-11
}

export const mesAtual = (): Mes => ({ ano: new Date().getFullYear(), mes: new Date().getMonth() });

const iso = (d: Date) => d.toLocaleDateString('sv-SE');

export function limitesDoMes({ ano, mes }: Mes) {
  return { de: iso(new Date(ano, mes, 1)), ate: iso(new Date(ano, mes + 1, 0)) };
}

export function SeletorMes({ valor, onChange }: { valor: Mes; onChange: (m: Mes) => void }) {
  const texto = new Date(valor.ano, valor.mes, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const nome = texto[0].toUpperCase() + texto.slice(1); // "Outubro de 2026"
  const mover = (delta: number) => {
    const d = new Date(valor.ano, valor.mes + delta, 1);
    onChange({ ano: d.getFullYear(), mes: d.getMonth() });
  };
  const ehAtual = valor.ano === mesAtual().ano && valor.mes === mesAtual().mes;
  return (
    <div className="flex items-center gap-1 rounded-lg border border-borda bg-card p-1">
      <button onClick={() => mover(-1)} className="rounded-md p-1.5 text-suave hover:bg-card-hover hover:text-white" aria-label="Mês anterior">
        <ChevronLeft className="size-4" />
      </button>
      <span className="min-w-36 text-center text-sm font-medium text-white">{nome}</span>
      <button onClick={() => mover(1)} disabled={ehAtual} className="rounded-md p-1.5 text-suave hover:bg-card-hover hover:text-white disabled:opacity-30" aria-label="Próximo mês">
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
