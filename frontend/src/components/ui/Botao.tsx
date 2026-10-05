import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

const variantes = {
  primario: 'bg-laranja-escuro text-white hover:bg-laranja disabled:bg-laranja-escuro/50',
  secundario: 'border border-borda bg-slate-800/60 text-texto hover:bg-card-hover hover:border-slate-600',
  perigo: 'border border-red-900/60 bg-red-950/40 text-red-300 hover:bg-red-900/50',
  sucesso: 'bg-emerald-600 text-white hover:bg-emerald-500',
  fantasma: 'text-suave hover:bg-card-hover hover:text-white',
} as const;

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: keyof typeof variantes;
  carregando?: boolean;
  icone?: ReactNode;
  tamanho?: 'md' | 'sm';
}

export function Botao({ variante = 'primario', carregando, icone, tamanho = 'md', className = '', children, disabled, ...props }: Props) {
  return (
    <button
      type="button"
      disabled={disabled || carregando}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        tamanho === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm'
      } ${variantes[variante]} ${className}`}
      {...props}
    >
      {carregando ? <Loader2 className="size-4 animate-spin" /> : icone}
      {children}
    </button>
  );
}
