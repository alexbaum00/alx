import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api, type Pagina } from '@/lib/api';
import { formatarMoeda } from '@/lib/formato';
import { useBuscaNaUrl } from '@/lib/hooks';
import { categoriasServico, type CategoriaServico } from '@/lib/categoriasServico';
import { FormularioCadastro } from '@/components/cadastro/FormularioCadastro';
import type { ConfigCadastro, Valores } from '@/components/cadastro/tipos';
import { Botao } from '@/components/ui/Botao';
import { Card } from '@/components/ui/Card';
import { Carregando, Erro, Vazio } from '@/components/ui/Estados';
import { CabecalhoPagina, CampoBusca, tdTabela, thTabela } from '@/components/ui/Pagina';
import { configServicos } from './configs';

interface Servico {
  id: number;
  nome: string;
  categoria: CategoriaServico;
  precoCentavos: number;
  tempoEstimadoMin: number | null;
  ativo: boolean;
}

// Uma oficina tem poucas dezenas de serviços: busca todos e agrupa na tela.
const LIMITE = 100;

// Novo serviço já com a categoria do bloco escolhida
const configComCategoria = (categoria: CategoriaServico): ConfigCadastro => ({
  ...configServicos,
  campos: configServicos.campos.map((c) => (c.nome === 'categoria' ? { ...c, padrao: categoria } : c)),
});

export function Servicos({ novo }: { novo?: boolean }) {
  const { texto, setTexto, termo } = useBuscaNaUrl();
  const [formulario, setFormulario] = useState<{ item: Valores | null; categoria?: CategoriaServico } | null>(novo ? { item: null } : null);

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['servicos', 'blocos', termo],
    queryFn: () => api<Pagina<Servico>>(`/servicos?porPagina=${LIMITE}&busca=${encodeURIComponent(termo)}`),
    placeholderData: keepPreviousData,
  });

  const blocos = categoriasServico
    .map((c) => ({ ...c, itens: data?.itens.filter((s) => s.categoria === c.valor) ?? [] }))
    .filter((b) => b.itens.length > 0);

  return (
    <div className="mx-auto max-w-5xl">
      <CabecalhoPagina
        titulo="Serviços"
        subtitulo="Mão de obra com preço sugerido; o valor pode ser ajustado em cada venda."
        acoes={
          <Botao icone={<Plus className="size-4" />} onClick={() => setFormulario({ item: null })}>
            Novo serviço
          </Botao>
        }
      />
      <div className="mb-4 flex gap-2">
        <CampoBusca valor={texto} onChange={setTexto} placeholder="Buscar serviço…" />
      </div>

      {isPending ? (
        <Carregando />
      ) : error ? (
        <Erro mensagem={error.message} onTentar={() => refetch()} />
      ) : blocos.length === 0 ? (
        <Card>
          <Vazio texto={termo ? `Nenhum serviço com “${termo}”.` : 'Nenhum serviço cadastrado ainda.'} />
        </Card>
      ) : (
        <div className="space-y-4">
          {blocos.map((b) => (
            <section key={b.valor} aria-label={`Serviços de ${b.rotulo}`} className={`overflow-hidden rounded-xl border ${b.bloco}`}>
              <header className={`flex items-center justify-between border-b px-4 py-2.5 ${b.cabecalho}`}>
                <h2 className={`flex items-center gap-2 text-sm font-bold tracking-wider uppercase ${b.titulo}`}>
                  <span className={`size-2.5 rounded-full ${b.marcador}`} aria-hidden />
                  {b.rotulo}
                  <span className="text-xs font-normal tracking-normal text-suave normal-case">
                    {b.itens.length} serviço{b.itens.length === 1 ? '' : 's'}
                  </span>
                </h2>
                <button
                  type="button"
                  onClick={() => setFormulario({ item: null, categoria: b.valor })}
                  className="rounded-md p-1.5 text-suave hover:bg-white/10 hover:text-white"
                  aria-label={`Novo serviço de ${b.rotulo}`}
                  title={`Novo serviço de ${b.rotulo}`}
                >
                  <Plus className="size-4" />
                </button>
              </header>
              {/* larguras fixas: as colunas ficam alinhadas de um bloco para o outro */}
              <table className="w-full table-fixed">
                <colgroup>
                  <col />
                  <col className="w-32" />
                  <col className="hidden w-28 sm:table-column" />
                </colgroup>
                <thead>
                  <tr>
                    <th className={thTabela}>Serviço</th>
                    <th className={`${thTabela} text-right`}>Preço</th>
                    <th className={`${thTabela} hidden text-right sm:table-cell`}>Tempo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {b.itens.map((s) => (
                    <tr key={s.id} onClick={() => setFormulario({ item: s as unknown as Valores })} className="cursor-pointer hover:bg-white/5">
                      <td className={tdTabela}>
                        <span className={`font-medium ${s.ativo ? 'text-white' : 'text-apagado line-through'}`}>{s.nome}</span>
                      </td>
                      <td className={`${tdTabela} text-right whitespace-nowrap`}>{formatarMoeda(s.precoCentavos)}</td>
                      <td className={`${tdTabela} hidden text-right text-suave sm:table-cell`}>{s.tempoEstimadoMin ? `${s.tempoEstimadoMin} min` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
          {data && data.total > LIMITE && (
            <p className="text-xs text-apagado">Mostrando {LIMITE} de {data.total} serviços. Use a busca para achar os demais.</p>
          )}
        </div>
      )}

      {formulario && (
        <FormularioCadastro
          key={(formulario.item?.id as number) ?? `novo-${formulario.categoria ?? ''}`}
          config={formulario.categoria ? configComCategoria(formulario.categoria) : configServicos}
          item={formulario.item}
          onFechar={() => setFormulario(null)}
        />
      )}
    </div>
  );
}
