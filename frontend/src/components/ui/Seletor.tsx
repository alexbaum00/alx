import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Loader2, Search, X } from 'lucide-react';
import { estiloCampo } from './Campos';

// Campo com busca para escolher um registro (cliente, veículo, produto...).
export function Seletor<T extends { id: number }>({ chave, buscar, valor, onChange, rotuloItem, detalheItem, placeholder = 'Buscar…', id, desabilitado, limpavel = true, rodapeLista }: {
  chave: string;
  buscar: (termo: string) => Promise<T[]>;
  valor: T | null;
  onChange: (item: T | null) => void;
  rotuloItem: (item: T) => string;
  detalheItem?: (item: T) => ReactNode;
  placeholder?: string;
  id?: string;
  desabilitado?: boolean;
  limpavel?: boolean;
  rodapeLista?: ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState('');
  const [atrasado, setAtrasado] = useState('');
  const [destaque, setDestaque] = useState(0);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setAtrasado(termo.trim()), 200);
    return () => clearTimeout(t);
  }, [termo]);

  useEffect(() => {
    const fora = (e: MouseEvent) => !caixa.current?.contains(e.target as Node) && setAberto(false);
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);

  const { data = [], isFetching } = useQuery({ queryKey: ['seletor', chave, atrasado], queryFn: () => buscar(atrasado), enabled: aberto });

  const escolher = (item: T) => {
    onChange(item);
    setAberto(false);
    setTermo('');
  };

  if (valor && !aberto) {
    return (
      <div className={`${estiloCampo} flex h-11 items-center gap-2 sm:h-10`}>
        <button type="button" id={id} disabled={desabilitado} onClick={() => setAberto(true)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className="truncate">{rotuloItem(valor)}</span>
        </button>
        {limpavel && !desabilitado && (
          <button type="button" onClick={() => onChange(null)} className="rounded p-0.5 text-apagado hover:text-white" aria-label="Limpar">
            <X className="size-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={caixa} className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-apagado" />
      <input
        id={id}
        disabled={desabilitado}
        autoFocus={aberto}
        value={termo}
        placeholder={placeholder}
        onFocus={() => setAberto(true)}
        onChange={(e) => {
          setTermo(e.target.value);
          setAberto(true);
          setDestaque(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') setDestaque((d) => Math.min(d + 1, data.length - 1));
          else if (e.key === 'ArrowUp') setDestaque((d) => Math.max(d - 1, 0));
          else if (e.key === 'Enter' && data[destaque]) {
            e.preventDefault();
            escolher(data[destaque]);
          } else if (e.key === 'Escape') setAberto(false);
        }}
        className={`${estiloCampo} h-11 pr-8 pl-9 sm:h-10`}
      />
      {isFetching ? (
        <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-apagado" />
      ) : (
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-apagado" />
      )}
      {aberto && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-borda bg-painel p-1 shadow-2xl shadow-black/60">
          {data.length === 0 && !isFetching && <p className="px-3 py-3 text-sm text-apagado">Nada encontrado.</p>}
          {data.map((item, i) => (
            <button
              type="button"
              key={item.id}
              onMouseEnter={() => setDestaque(i)}
              onClick={() => escolher(item)}
              className={`flex w-full flex-col rounded-md px-3 py-2 text-left text-sm ${i === destaque ? 'bg-card-hover' : ''}`}
            >
              <span className="text-texto">{rotuloItem(item)}</span>
              {detalheItem && <span className="text-xs text-apagado">{detalheItem(item)}</span>}
            </button>
          ))}
          {rodapeLista}
        </div>
      )}
    </div>
  );
}
