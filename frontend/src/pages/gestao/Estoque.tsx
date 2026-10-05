import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PackagePlus, SlidersHorizontal } from 'lucide-react';
import { api, type Pagina } from '@/lib/api';
import { formatarDataHora, formatarMoeda, formatarQuantidade } from '@/lib/formato';
import { useBuscaNaUrl } from '@/lib/hooks';
import { Card } from '@/components/ui/Card';
import { Botao } from '@/components/ui/Botao';
import { Badge } from '@/components/ui/Badge';
import { Abas } from '@/components/ui/Abas';
import { Carregando, Erro, Vazio } from '@/components/ui/Estados';
import { Modal } from '@/components/ui/Modal';
import { Paginacao } from '@/components/ui/Paginacao';
import { Seletor } from '@/components/ui/Seletor';
import { Campo, CampoDinheiro, CampoQuantidade, Input, lerNumero } from '@/components/ui/Campos';
import { CabecalhoPagina, CampoBusca, tdTabela, thTabela } from '@/components/ui/Pagina';
import { useAviso } from '@/components/ui/Toast';
import { IconeProduto } from '@/components/ui/IconeProduto';

interface ProdutoEstoque {
  id: number;
  nome: string;
  sku: string | null;
  categoria: string | null;
  unidade: string;
  estoqueAtual: number;
  estoqueMinimo: number;
  precoCustoCentavos: number;
  precoVendaCentavos: number;
  estoqueBaixo: boolean;
  imagemId: string | null;
}

interface Movimentacao {
  id: number;
  tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE';
  quantidade: number;
  motivo: string | null;
  createdAt: string;
}

type Acao = { tipo: 'entrada' | 'ajuste' | 'historico'; produto: ProdutoEstoque | null };

export function Estoque({ entrada }: { entrada?: boolean }) {
  const { texto, setTexto, termo } = useBuscaNaUrl();
  const [params] = useSearchParams();
  const [filtro, setFiltro] = useState<'todos' | 'baixo'>(params.get('estoqueBaixo') === 'true' ? 'baixo' : 'todos');
  const [pagina, setPagina] = useState(1);
  const [acao, setAcao] = useState<Acao | null>(entrada ? { tipo: 'entrada', produto: null } : null);
  const navigate = useNavigate();
  useEffect(() => setPagina(1), [termo, filtro]);

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['produtos', 'estoque', termo, filtro, pagina],
    queryFn: () => api<Pagina<ProdutoEstoque>>(`/produtos?busca=${encodeURIComponent(termo)}&pagina=${pagina}&porPagina=25${filtro === 'baixo' ? '&estoqueBaixo=true' : ''}`),
    placeholderData: keepPreviousData,
  });

  const fechar = () => {
    setAcao(null);
    if (entrada) navigate('/estoque', { replace: true });
  };

  return (
    <div className="mx-auto max-w-6xl">
      <CabecalhoPagina
        titulo="Estoque"
        subtitulo="Clique em um produto para ver o histórico de entradas e saídas."
        acoes={
          <Botao icone={<PackagePlus className="size-4" />} onClick={() => setAcao({ tipo: 'entrada', produto: null })}>
            Entrada de mercadoria
          </Botao>
        }
      />
      <div className="mb-3 flex flex-col gap-2 md:flex-row">
        <CampoBusca valor={texto} onChange={setTexto} placeholder="Buscar peça por nome, código ou categoria…" />
        <Abas
          opcoes={[
            { valor: 'todos', rotulo: 'Todos' },
            { valor: 'baixo', rotulo: 'Estoque baixo' },
          ]}
          valor={filtro}
          onChange={setFiltro}
        />
      </div>
      <Card>
        {isPending ? (
          <Carregando />
        ) : error ? (
          <Erro mensagem={error.message} onTentar={() => refetch()} />
        ) : data.itens.length === 0 ? (
          <Vazio texto={filtro === 'baixo' ? 'Nenhum produto com estoque baixo. 👍' : 'Nenhum produto encontrado.'} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-borda">
                  <tr>
                    <th className={thTabela}>Produto</th>
                    <th className={`${thTabela} text-right`}>Estoque</th>
                    <th className={`${thTabela} hidden text-right sm:table-cell`}>Mínimo</th>
                    <th className={`${thTabela} hidden text-right md:table-cell`}>Custo</th>
                    <th className={`${thTabela} hidden text-right md:table-cell`}>Valor em estoque</th>
                    <th className={`${thTabela} text-right`}>Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borda/60">
                  {data.itens.map((p) => (
                    <tr key={p.id} onClick={() => setAcao({ tipo: 'historico', produto: p })} className="cursor-pointer hover:bg-card-hover">
                      <td className={tdTabela}>
                        <span className="flex items-center gap-3">
                          <IconeProduto nome={p.nome} categoria={p.categoria} imagemId={p.imagemId} tamanho="size-9" />
                          <span>
                            <span className="block text-texto">{p.nome}</span>
                            <span className="text-xs text-apagado">{[p.categoria, p.sku].filter(Boolean).join(' · ')}</span>
                          </span>
                        </span>
                      </td>
                      <td className={`${tdTabela} text-right whitespace-nowrap`}>
                        <span className="inline-flex items-center gap-2">
                          {formatarQuantidade(p.estoqueAtual)} {p.unidade}
                          {p.estoqueBaixo ? <Badge cor="laranja">Baixo</Badge> : <Badge cor="verde">OK</Badge>}
                        </span>
                      </td>
                      <td className={`${tdTabela} hidden text-right text-suave sm:table-cell`}>{formatarQuantidade(p.estoqueMinimo)}</td>
                      <td className={`${tdTabela} hidden text-right text-suave md:table-cell`}>{formatarMoeda(p.precoCustoCentavos)}</td>
                      <td className={`${tdTabela} hidden text-right md:table-cell`}>{formatarMoeda(Math.round(p.precoCustoCentavos * Math.max(0, p.estoqueAtual)))}</td>
                      <td className={`${tdTabela} text-right`} onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex gap-1">
                          <Botao tamanho="sm" variante="secundario" icone={<PackagePlus className="size-3.5" />} onClick={() => setAcao({ tipo: 'entrada', produto: p })}>
                            <span className="hidden sm:inline">Entrada</span>
                          </Botao>
                          <Botao tamanho="sm" variante="fantasma" icone={<SlidersHorizontal className="size-3.5" />} onClick={() => setAcao({ tipo: 'ajuste', produto: p })} aria-label="Ajustar estoque" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacao pagina={pagina} porPagina={25} total={data.total} onMudar={setPagina} />
          </>
        )}
      </Card>

      {acao?.tipo === 'entrada' && <ModalEntrada produtoInicial={acao.produto} onFechar={fechar} />}
      {acao?.tipo === 'ajuste' && acao.produto && <ModalAjuste produto={acao.produto} onFechar={fechar} />}
      {acao?.tipo === 'historico' && acao.produto && <ModalHistorico produto={acao.produto} onFechar={fechar} />}
    </div>
  );
}

const buscarProdutos = async (termo: string) => (await api<Pagina<ProdutoEstoque>>(`/produtos?porPagina=10&busca=${encodeURIComponent(termo)}`)).itens;

function useAposMovimentar() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['produtos'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['seletor'] });
  };
}

// Entrada de mercadoria: ao salvar, limpa para lançar o próximo item da mesma nota.
function ModalEntrada({ produtoInicial, onFechar }: { produtoInicial: ProdutoEstoque | null; onFechar: () => void }) {
  const [produto, setProduto] = useState<ProdutoEstoque | null>(produtoInicial);
  const [quantidade, setQuantidade] = useState('');
  const [custo, setCusto] = useState(produtoInicial?.precoCustoCentavos ?? 0);
  const [motivo, setMotivo] = useState('');
  const avisar = useAviso();
  const aposMovimentar = useAposMovimentar();

  const salvar = useMutation({
    mutationFn: () =>
      api(`/produtos/${produto!.id}/entrada`, {
        method: 'POST',
        body: JSON.stringify({ quantidade: lerNumero(quantidade), custoUnitarioCentavos: custo || undefined, motivo }),
      }),
    onSuccess: () => {
      aposMovimentar();
      avisar(`Entrada de ${quantidade} ${produto!.unidade} de ${produto!.nome} registrada.`);
      if (produtoInicial) return onFechar();
      setProduto(null);
      setQuantidade('');
      setCusto(0);
    },
    onError: (e) => avisar(e.message, 'erro'),
  });

  const q = lerNumero(quantidade);
  return (
    <Modal
      aberto
      onFechar={onFechar}
      titulo="Entrada de mercadoria"
      largura="max-w-lg"
      rodape={
        <>
          <Botao variante="secundario" onClick={onFechar}>
            Fechar
          </Botao>
          <Botao carregando={salvar.isPending} disabled={!produto || !(q > 0)} onClick={() => salvar.mutate()}>
            Registrar entrada
          </Botao>
        </>
      }
    >
      <div className="space-y-4">
        <Campo rotulo="Produto" obrigatorio>
          <Seletor<ProdutoEstoque>
            chave="entrada-produto"
            buscar={buscarProdutos}
            valor={produto}
            onChange={(p) => {
              setProduto(p);
              setCusto(p?.precoCustoCentavos ?? 0);
            }}
            rotuloItem={(p) => p.nome}
            detalheItem={(p) => `${formatarQuantidade(p.estoqueAtual)} ${p.unidade} em estoque`}
            placeholder="Nome ou código da peça…"
          />
        </Campo>
        <div className="grid grid-cols-2 gap-4">
          <Campo rotulo={`Quantidade${produto ? ` (${produto.unidade})` : ''}`} obrigatorio>
            <CampoQuantidade valor={quantidade} onChange={setQuantidade} placeholder="0" />
          </Campo>
          <Campo rotulo="Custo unitário" ajuda="Atualiza o custo do produto">
            <CampoDinheiro valor={custo} onChange={setCusto} />
          </Campo>
        </div>
        <Campo rotulo="Observação">
          <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: NF 1234 — DistriAuto" />
        </Campo>
        {produto && q > 0 && (
          <p className="text-sm text-suave">
            Estoque passa de {formatarQuantidade(produto.estoqueAtual)} para <strong className="text-white">{formatarQuantidade(produto.estoqueAtual + q)}</strong> {produto.unidade}.
          </p>
        )}
      </div>
    </Modal>
  );
}

function ModalAjuste({ produto, onFechar }: { produto: ProdutoEstoque; onFechar: () => void }) {
  const [quantidade, setQuantidade] = useState(formatarQuantidade(produto.estoqueAtual));
  const [motivo, setMotivo] = useState('');
  const avisar = useAviso();
  const aposMovimentar = useAposMovimentar();
  const salvar = useMutation({
    mutationFn: () => api(`/produtos/${produto.id}/ajuste`, { method: 'POST', body: JSON.stringify({ estoqueAtual: lerNumero(quantidade), motivo }) }),
    onSuccess: () => {
      aposMovimentar();
      avisar('Estoque ajustado.');
      onFechar();
    },
    onError: (e) => avisar(e.message, 'erro'),
  });
  const q = lerNumero(quantidade);
  return (
    <Modal
      aberto
      onFechar={onFechar}
      titulo={`Ajustar estoque — ${produto.nome}`}
      largura="max-w-md"
      rodape={
        <>
          <Botao variante="secundario" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao carregando={salvar.isPending} disabled={!(q >= 0) || !motivo.trim()} onClick={() => salvar.mutate()}>
            Salvar ajuste
          </Botao>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-suave">Use depois de contar as peças na prateleira. A diferença fica registrada no histórico.</p>
        <Campo rotulo={`Quantidade contada (${produto.unidade})`} ajuda={`No sistema: ${formatarQuantidade(produto.estoqueAtual)}`}>
          <CampoQuantidade valor={quantidade} onChange={setQuantidade} />
        </Campo>
        <Campo rotulo="Motivo" obrigatorio>
          <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Contagem, avaria, perda…" />
        </Campo>
      </div>
    </Modal>
  );
}

const nomesMov = { ENTRADA: ['Entrada', 'text-emerald-400'], SAIDA: ['Saída', 'text-orange-400'], AJUSTE: ['Ajuste', 'text-sky-400'] } as const;

function ModalHistorico({ produto, onFechar }: { produto: ProdutoEstoque; onFechar: () => void }) {
  const { data, isPending } = useQuery({
    queryKey: ['produtos', 'historico', produto.id],
    queryFn: () => api<{ movimentacoes: Movimentacao[] }>(`/produtos/${produto.id}`),
  });
  return (
    <Modal aberto onFechar={onFechar} titulo={produto.nome} largura="max-w-lg">
      <p className="mb-3 text-sm text-suave">
        Em estoque: <strong className="text-white">{formatarQuantidade(produto.estoqueAtual)} {produto.unidade}</strong> · mínimo {formatarQuantidade(produto.estoqueMinimo)}
      </p>
      {isPending ? (
        <Carregando />
      ) : !data?.movimentacoes.length ? (
        <Vazio texto="Sem movimentações registradas." />
      ) : (
        <ul className="divide-y divide-borda/60 rounded-lg border border-borda">
          {data.movimentacoes.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className={`w-14 text-xs font-medium ${nomesMov[m.tipo][1]}`}>{nomesMov[m.tipo][0]}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-texto">{m.motivo ?? '—'}</span>
                <span className="text-xs text-apagado">{formatarDataHora(m.createdAt)}</span>
              </span>
              <span className={`font-medium tabular-nums ${m.quantidade < 0 ? 'text-orange-300' : 'text-emerald-300'}`}>
                {m.quantidade > 0 ? '+' : ''}
                {formatarQuantidade(m.quantidade)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
