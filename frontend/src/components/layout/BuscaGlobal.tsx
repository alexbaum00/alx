import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Car, Loader2, Package, Search, User } from 'lucide-react';
import { api, type ClienteResumo, type Pagina, type ProdutoResumo, type VeiculoResumo } from '@/lib/api';
import { formatarPlaca, formatarQuantidade } from '@/lib/formato';

function useDebounce<T>(valor: T, ms: number) {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return atrasado;
}

// Busca de cliente, veículo (placa) e peça ao mesmo tempo.
export function BuscaGlobal() {
  const [texto, setTexto] = useState('');
  const [aberta, setAberta] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const termo = useDebounce(texto.trim(), 250);

  const { data, isFetching } = useQuery({
    queryKey: ['busca-global', termo],
    enabled: termo.length >= 2,
    queryFn: async () => {
      const q = `?busca=${encodeURIComponent(termo)}&porPagina=5`;
      const [clientes, veiculos, produtos] = await Promise.all([
        api<Pagina<ClienteResumo>>(`/clientes${q}`),
        api<Pagina<VeiculoResumo>>(`/veiculos${q}`),
        api<Pagina<ProdutoResumo>>(`/produtos${q}`),
      ]);
      return { clientes: clientes.itens, veiculos: veiculos.itens, produtos: produtos.itens };
    },
  });

  useEffect(() => {
    const fora = (e: MouseEvent) => !caixa.current?.contains(e.target as Node) && setAberta(false);
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);

  const fechar = () => {
    setAberta(false);
    setTexto('');
  };
  const vazio = data && !data.clientes.length && !data.veiculos.length && !data.produtos.length;

  return (
    <div ref={caixa} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-apagado" />
      <input
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setAberta(true);
        }}
        onFocus={() => setAberta(true)}
        onKeyDown={(e) => e.key === 'Escape' && fechar()}
        placeholder="Buscar por cliente, veículo, peça..."
        className="h-10 w-full rounded-lg border border-borda bg-card pr-9 pl-9 text-sm text-texto placeholder:text-apagado focus:border-laranja/60 focus:ring-2 focus:ring-laranja/20 focus:outline-none"
      />
      {isFetching && <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-apagado" />}

      {aberta && termo.length >= 2 && data && (
        <div className="absolute inset-x-0 top-12 z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-borda bg-painel p-2 shadow-2xl shadow-black/50">
          {vazio && <p className="px-3 py-4 text-center text-sm text-apagado">Nada encontrado para “{termo}”.</p>}
          <Grupo titulo="Clientes" itens={data.clientes}>
            {(c) => (
              <Resultado key={c.id} para={`/cadastros/clientes?busca=${encodeURIComponent(c.nome)}`} onClick={fechar} icone={<User className="size-4" />}>
                <span className="text-texto">{c.nome}</span>
                <span className="text-xs text-apagado">{c.veiculos.map((v) => formatarPlaca(v.placa)).join(', ') || c.telefone}</span>
              </Resultado>
            )}
          </Grupo>
          <Grupo titulo="Veículos" itens={data.veiculos}>
            {(v) => (
              <Resultado key={v.id} para={`/cadastros/veiculos?busca=${v.placa}`} onClick={fechar} icone={<Car className="size-4" />}>
                <span className="font-mono text-texto">{formatarPlaca(v.placa)}</span>
                <span className="text-xs text-apagado">
                  {[v.marca, v.modelo].filter(Boolean).join(' ')} · {v.cliente.nome}
                </span>
              </Resultado>
            )}
          </Grupo>
          <Grupo titulo="Peças" itens={data.produtos}>
            {(p) => (
              <Resultado key={p.id} para={`/estoque?busca=${encodeURIComponent(p.nome)}`} onClick={fechar} icone={<Package className="size-4" />}>
                <span className="text-texto">{p.nome}</span>
                <span className={`text-xs ${p.estoqueBaixo ? 'text-orange-400' : 'text-apagado'}`}>
                  {formatarQuantidade(p.estoqueAtual)} {p.unidade} em estoque
                </span>
              </Resultado>
            )}
          </Grupo>
        </div>
      )}
    </div>
  );
}

function Grupo<T>({ titulo, itens, children }: { titulo: string; itens: T[]; children: (item: T) => React.ReactNode }) {
  if (!itens.length) return null;
  return (
    <div className="py-1">
      <p className="px-3 pt-1 pb-1 text-[11px] font-semibold tracking-wider text-apagado uppercase">{titulo}</p>
      {itens.map(children)}
    </div>
  );
}

function Resultado({ para, onClick, icone, children }: { para: string; onClick: () => void; icone: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link to={para} onClick={onClick} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-card-hover">
      <span className="text-suave">{icone}</span>
      <span className="flex min-w-0 flex-col">{children}</span>
    </Link>
  );
}
