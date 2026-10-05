import { AlertCircle, Loader2 } from 'lucide-react';

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-sm text-suave">
      <Loader2 className="size-4 animate-spin" /> {texto}
    </div>
  );
}

export function Erro({ mensagem, onTentar }: { mensagem: string; onTentar?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-red-300">
      <AlertCircle className="size-5" />
      <p>{mensagem}</p>
      {onTentar && (
        <button onClick={onTentar} className="rounded-md border border-borda px-3 py-1 text-xs text-texto hover:bg-card-hover">
          Tentar de novo
        </button>
      )}
    </div>
  );
}

export function Vazio({ texto }: { texto: string }) {
  return <p className="px-4 py-8 text-center text-sm text-apagado">{texto}</p>;
}
