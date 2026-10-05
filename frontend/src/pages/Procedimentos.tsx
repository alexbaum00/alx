import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Camera, ChevronDown, Pencil, Plus, Search } from 'lucide-react';
import { api, type Pagina } from '@/lib/api';
import { formatarPlaca } from '@/lib/formato';
import { Card } from '@/components/ui/Card';
import { Carregando, Erro, Vazio } from '@/components/ui/Estados';
import { Botao } from '@/components/ui/Botao';
import { Galeria } from '@/components/ui/Fotos';
import { FormularioCadastro } from '@/components/cadastro/FormularioCadastro';
import { configProcedimentos } from './cadastros/configs';

interface Procedimento {
  id: number;
  modeloVeiculo: string;
  defeitoReclamado: string;
  diagnosticoEncontrado: string | null;
  solucaoAplicada: string | null;
  esquemaEletricoAnotacoes: string | null;
  tags: string | null;
  imagens: { id: string; legenda: string | null }[];
  updatedAt: string;
  veiculo: { id: number; placa: string; modelo: string } | null;
}

// Consulta rápida da base técnica, com cadastro e edição.
export function Procedimentos() {
  const [params, setParams] = useSearchParams();
  const [texto, setTexto] = useState(params.get('busca') ?? '');
  const [formulario, setFormulario] = useState<{ item: Procedimento | null } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setParams(texto.trim() ? { busca: texto.trim() } : {}, { replace: true }), 300);
    return () => clearTimeout(t);
  }, [texto, setParams]);

  const busca = params.get('busca') ?? '';
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['procedimentos', busca],
    queryFn: () => api<Pagina<Procedimento>>(`/procedimentos?porPagina=50&busca=${encodeURIComponent(busca)}`),
  });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Procedimentos</h1>
          <p className="text-sm text-suave">Defeitos, diagnósticos e macetes já resolvidos.</p>
        </div>
        <Botao icone={<Plus className="size-4" />} onClick={() => setFormulario({ item: null })}>
          Novo procedimento
        </Botao>
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-apagado" />
        <input
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ex.: polo bateria descarregando, SC24, alternador…"
          className="h-12 w-full rounded-xl border border-borda bg-card pr-4 pl-11 text-texto placeholder:text-apagado focus:border-laranja/60 focus:ring-2 focus:ring-laranja/20 focus:outline-none"
        />
      </div>

      {isPending ? (
        <Carregando />
      ) : error ? (
        <Erro mensagem={error.message} onTentar={() => refetch()} />
      ) : data.itens.length === 0 ? (
        <Card>
          <Vazio texto={busca ? `Nenhum procedimento com “${busca}”.` : 'Nenhum procedimento registrado ainda.'} />
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-apagado">
            {data.total} resultado{data.total === 1 ? '' : 's'}
          </p>
          {data.itens.map((p) => (
            <ItemProcedimento key={p.id} p={p} abertoInicial={data.itens.length === 1} onEditar={() => setFormulario({ item: p })} />
          ))}
        </div>
      )}
      {formulario && (
        <FormularioCadastro
          key={formulario.item?.id ?? 'novo'}
          config={configProcedimentos}
          item={formulario.item as unknown as Record<string, unknown> | null}
          onFechar={() => setFormulario(null)}
        />
      )}
    </div>
  );
}

function ItemProcedimento({ p, abertoInicial, onEditar }: { p: Procedimento; abertoInicial: boolean; onEditar: () => void }) {
  const [aberto, setAberto] = useState(abertoInicial);
  return (
    <Card>
      <button onClick={() => setAberto((v) => !v)} className="flex w-full items-start gap-3 p-4 text-left" aria-expanded={aberto}>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium tracking-wide text-laranja uppercase">
            {p.modeloVeiculo}
            {p.veiculo && <span className="ml-2 font-mono text-apagado">{formatarPlaca(p.veiculo.placa)}</span>}
          </span>
          <span className="mt-0.5 flex items-center gap-2 font-medium text-white">
            {p.defeitoReclamado}
            {p.imagens.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-normal text-suave" title={`${p.imagens.length} foto(s)`}>
                <Camera className="size-3" /> {p.imagens.length}
              </span>
            )}
          </span>
          {!aberto && p.solucaoAplicada && <span className="mt-1 block truncate text-sm text-suave">{p.solucaoAplicada}</span>}
        </span>
        <ChevronDown className={`mt-1 size-5 shrink-0 text-apagado transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>
      {aberto && (
        <dl className="grid gap-3 border-t border-borda px-4 py-4 text-sm">
          <Campo titulo="Diagnóstico" texto={p.diagnosticoEncontrado} />
          <Campo titulo="Solução aplicada" texto={p.solucaoAplicada} />
          <Campo titulo="Esquema elétrico / anotações" texto={p.esquemaEletricoAnotacoes} destaque />
          {p.imagens.length > 0 && (
            <div>
              <dt className="mb-1.5 text-xs font-medium text-apagado">Fotos</dt>
              <dd>
                <Galeria fotos={p.imagens} />
              </dd>
            </div>
          )}
          <div className="flex justify-end">
            <Botao variante="secundario" tamanho="sm" icone={<Pencil className="size-3.5" />} onClick={onEditar}>
              Editar
            </Botao>
          </div>
          {p.tags && (
            <div className="flex flex-wrap gap-1.5">
              {p.tags.split(',').map((t) => (
                <span key={t} className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-suave">
                  {t.trim()}
                </span>
              ))}
            </div>
          )}
        </dl>
      )}
    </Card>
  );
}

function Campo({ titulo, texto, destaque }: { titulo: string; texto: string | null; destaque?: boolean }) {
  if (!texto) return null;
  return (
    <div>
      <dt className="mb-0.5 text-xs font-medium text-apagado">{titulo}</dt>
      <dd className={`whitespace-pre-wrap ${destaque ? 'rounded-lg bg-slate-900/60 p-3 font-mono text-[13px] text-amber-100' : 'text-texto'}`}>{texto}</dd>
    </div>
  );
}
