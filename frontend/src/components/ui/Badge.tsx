import type { StatusVenda } from '@/lib/api';

const cores = {
  verde: 'bg-emerald-600/90 text-white',
  laranja: 'bg-laranja-escuro text-white',
  azul: 'bg-sky-600/90 text-white',
  amarelo: 'bg-amber-500/90 text-slate-950',
  vermelho: 'bg-red-600/90 text-white',
  cinza: 'bg-slate-600 text-white',
} as const;

export type CorBadge = keyof typeof cores;

export function Badge({ cor, children }: { cor: CorBadge; children: string }) {
  return (
    <span className={`inline-flex min-w-11 justify-center rounded-md px-2 py-0.5 text-xs font-semibold ${cores[cor]}`}>
      {children}
    </span>
  );
}

const statusVenda: Record<StatusVenda, [CorBadge, string]> = {
  PAGO: ['verde', 'Pago'],
  CONCLUIDO: ['azul', 'Concluído'],
  ABERTO: ['amarelo', 'Aberto'],
  CANCELADO: ['vermelho', 'Cancelado'],
};

export function BadgeStatusVenda({ status }: { status: StatusVenda }) {
  const [cor, texto] = statusVenda[status];
  return <Badge cor={cor}>{texto}</Badge>;
}
