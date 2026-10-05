import { useState } from 'react';
import { PackageOpen, Plus, Trash2, TriangleAlert, Wrench } from 'lucide-react';
import { api, type ItemDocumento, type Pagina, type ProdutoResumo } from '@/lib/api';
import { formatarMoeda, formatarQuantidade } from '@/lib/formato';
import { Seletor } from '@/components/ui/Seletor';
import { CampoDinheiro, CampoQuantidade, Input, lerNumero } from '@/components/ui/Campos';
import { Botao } from '@/components/ui/Botao';

export interface ItemForm {
  chave: string;
  tipo: 'PRODUTO' | 'SERVICO';
  produtoId?: number;
  servicoId?: number;
  descricao: string;
  quantidade: string;
  valorUnitarioCentavos: number;
  unidade?: string;
  estoqueDisponivel?: number;
  avulso?: boolean;
}

interface Opcao {
  id: number; // id único na lista (serviços com id negativo)
  tipo: 'PRODUTO' | 'SERVICO';
  refId: number;
  nome: string;
  preco: number;
  unidade?: string;
  estoque?: number;
  detalhe?: string;
}

let contador = 0;
const novaChave = () => `i${Date.now()}-${contador++}`;

export const totalItem = (i: ItemForm) => {
  const q = lerNumero(i.quantidade);
  return Number.isFinite(q) ? Math.round(q * i.valorUnitarioCentavos) : 0;
};

export function itensDoDocumento(itens: ItemDocumento[]): ItemForm[] {
  return itens.map((i) => ({
    chave: novaChave(),
    tipo: i.tipo,
    produtoId: i.produtoId ?? undefined,
    servicoId: i.servicoId ?? undefined,
    descricao: i.descricao,
    quantidade: formatarQuantidade(i.quantidade),
    valorUnitarioCentavos: i.valorUnitarioCentavos,
    avulso: i.tipo === 'SERVICO' && !i.servicoId,
  }));
}

export function itensParaApi(itens: ItemForm[]) {
  return itens.map((i) =>
    i.tipo === 'PRODUTO'
      ? { tipo: 'PRODUTO' as const, produtoId: i.produtoId!, quantidade: lerNumero(i.quantidade), valorUnitarioCentavos: i.valorUnitarioCentavos, descricao: i.descricao }
      : { tipo: 'SERVICO' as const, servicoId: i.servicoId, descricao: i.descricao.trim(), quantidade: lerNumero(i.quantidade), valorUnitarioCentavos: i.valorUnitarioCentavos },
  );
}

// Retorna a mensagem do primeiro problema encontrado nos itens, ou null.
export function validarItens(itens: ItemForm[]): string | null {
  if (!itens.length) return 'Inclua ao menos uma peça ou serviço.';
  for (const i of itens) {
    const q = lerNumero(i.quantidade);
    if (!Number.isFinite(q) || q <= 0) return `Quantidade inválida em “${i.descricao || 'item'}”.`;
    if (!i.descricao.trim()) return 'Descreva o serviço avulso.';
  }
  return null;
}

async function buscarProdutosEServicos(termo: string): Promise<Opcao[]> {
  const q = `porPagina=8&busca=${encodeURIComponent(termo)}`;
  const [produtos, servicos] = await Promise.all([
    api<Pagina<ProdutoResumo>>(`/produtos?${q}`),
    api<Pagina<{ id: number; nome: string; precoCentavos: number; ativo: boolean }>>(`/servicos?${q}`),
  ]);
  return [
    ...servicos.itens
      .filter((s) => s.ativo)
      .map((s) => ({ id: -s.id, tipo: 'SERVICO' as const, refId: s.id, nome: s.nome, preco: s.precoCentavos, detalhe: `Serviço · ${formatarMoeda(s.precoCentavos)}` })),
    ...produtos.itens.map((p) => ({
      id: p.id,
      tipo: 'PRODUTO' as const,
      refId: p.id,
      nome: p.nome,
      preco: p.precoVendaCentavos,
      unidade: p.unidade,
      estoque: p.estoqueAtual,
      detalhe: `Peça · ${formatarMoeda(p.precoVendaCentavos)} · ${formatarQuantidade(p.estoqueAtual)} ${p.unidade} em estoque`,
    })),
  ];
}

export function EditorItens({ itens, onChange, avisarEstoque = true }: { itens: ItemForm[]; onChange: (itens: ItemForm[]) => void; avisarEstoque?: boolean }) {
  const [chaveSeletor, setChaveSeletor] = useState(0);

  const adicionar = (o: Opcao) => {
    // mesma peça de novo: soma na linha existente
    const existente = o.tipo === 'PRODUTO' && itens.find((i) => i.produtoId === o.refId);
    if (existente) {
      onChange(itens.map((i) => (i === existente ? { ...i, quantidade: formatarQuantidade(lerNumero(i.quantidade) + 1) } : i)));
    } else {
      onChange([
        ...itens,
        {
          chave: novaChave(),
          tipo: o.tipo,
          produtoId: o.tipo === 'PRODUTO' ? o.refId : undefined,
          servicoId: o.tipo === 'SERVICO' ? o.refId : undefined,
          descricao: o.nome,
          quantidade: '1',
          valorUnitarioCentavos: o.preco,
          unidade: o.unidade,
          estoqueDisponivel: o.estoque,
        },
      ]);
    }
    setChaveSeletor((k) => k + 1);
  };

  const mudar = (chave: string, parcial: Partial<ItemForm>) => onChange(itens.map((i) => (i.chave === chave ? { ...i, ...parcial } : i)));

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="min-w-0 flex-1">
          <Seletor<Opcao>
            key={chaveSeletor}
            chave="itens-venda"
            buscar={buscarProdutosEServicos}
            valor={null}
            onChange={(o) => o && adicionar(o)}
            rotuloItem={(o) => o.nome}
            detalheItem={(o) => o.detalhe}
            placeholder="Adicionar peça ou serviço (nome ou código)…"
          />
        </div>
        <Botao
          variante="secundario"
          icone={<Plus className="size-4" />}
          onClick={() => onChange([...itens, { chave: novaChave(), tipo: 'SERVICO', descricao: '', quantidade: '1', valorUnitarioCentavos: 0, avulso: true }])}
        >
          Serviço avulso
        </Botao>
      </div>

      {itens.length === 0 ? (
        <p className="rounded-lg border border-dashed border-borda px-4 py-6 text-center text-sm text-apagado">Nenhum item ainda. Busque uma peça ou serviço acima.</p>
      ) : (
        <ul className="divide-y divide-borda/70 rounded-lg border border-borda">
          {itens.map((i) => {
            const qtd = lerNumero(i.quantidade);
            const semEstoque = avisarEstoque && i.tipo === 'PRODUTO' && i.estoqueDisponivel != null && qtd > i.estoqueDisponivel;
            return (
              <li key={i.chave} className="grid grid-cols-12 items-center gap-2 p-3">
                <div className="col-span-12 flex min-w-0 items-center gap-2 sm:col-span-5">
                  {i.tipo === 'PRODUTO' ? <PackageOpen className="size-4 shrink-0 text-sky-400" /> : <Wrench className="size-4 shrink-0 text-laranja" />}
                  {i.avulso ? (
                    <Input value={i.descricao} placeholder="Descrição do serviço" onChange={(e) => mudar(i.chave, { descricao: e.target.value })} autoFocus={!i.descricao} />
                  ) : (
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-texto">{i.descricao}</span>
                      {semEstoque && (
                        <span className="flex items-center gap-1 text-xs text-orange-400">
                          <TriangleAlert className="size-3" /> Só {formatarQuantidade(i.estoqueDisponivel!)} {i.unidade} em estoque
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <CampoQuantidade valor={i.quantidade} onChange={(q) => mudar(i.chave, { quantidade: q })} aria-label="Quantidade" />
                </div>
                <div className="col-span-5 sm:col-span-2">
                  <CampoDinheiro valor={i.valorUnitarioCentavos} onChange={(v) => mudar(i.chave, { valorUnitarioCentavos: v })} aria-label="Valor unitário" />
                </div>
                <div className="col-span-3 text-right text-sm font-medium whitespace-nowrap text-white sm:col-span-2">{formatarMoeda(totalItem(i))}</div>
                <div className="col-span-1 text-right">
                  <button type="button" onClick={() => onChange(itens.filter((x) => x.chave !== i.chave))} className="rounded-md p-1.5 text-apagado hover:bg-red-950/50 hover:text-red-300" aria-label="Remover item">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function ResumoTotais({ itens, desconto, onDesconto }: { itens: ItemForm[]; desconto: number; onDesconto: (v: number) => void }) {
  const soma = (tipo: ItemForm['tipo']) => itens.filter((i) => i.tipo === tipo).reduce((t, i) => t + totalItem(i), 0);
  const produtos = soma('PRODUTO');
  const servicos = soma('SERVICO');
  const total = produtos + servicos - desconto;
  return (
    <div className="space-y-2 text-sm">
      <Linha rotulo="Peças" valor={formatarMoeda(produtos)} />
      <Linha rotulo="Serviços" valor={formatarMoeda(servicos)} />
      <div className="flex items-center justify-between gap-3">
        <span className="text-suave">Desconto</span>
        <div className="w-40">
          <CampoDinheiro valor={desconto} onChange={onDesconto} aria-label="Desconto" />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-borda pt-3">
        <span className="font-semibold text-white">Total</span>
        <span className={`text-2xl font-bold ${total < 0 ? 'text-red-400' : 'text-white'}`}>{formatarMoeda(total)}</span>
      </div>
      {total < 0 && <p className="text-xs text-red-400">O desconto é maior que o valor dos itens.</p>}
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-suave">{rotulo}</span>
      <span className="text-texto">{valor}</span>
    </div>
  );
}
