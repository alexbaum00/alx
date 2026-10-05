import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { fimDoDia, inicioDoDia } from '../lib/datas.js';

// Sem período informado, usa o mês corrente.
export function periodo(de?: Date, ate?: Date) {
  const hoje = new Date();
  return {
    de: inicioDoDia(de ?? new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
    ate: fimDoDia(ate ?? hoje),
  };
}

const chaveDia = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Tela Financeiro: entradas (vendas pagas), a receber, despesas e saldo.
export async function resumoFinanceiro(deIn?: Date, ateIn?: Date) {
  const { de, ate } = periodo(deIn, ateIn);
  const noPeriodo = { data: { gte: de, lte: ate } };

  const [pagas, porForma, aReceber, despesasPagas, despesasPendentes] = await Promise.all([
    prisma.venda.aggregate({ where: { ...noPeriodo, status: 'PAGO' }, _sum: { valorTotalCentavos: true }, _count: true }),
    prisma.venda.groupBy({
      by: ['formaPagamento'],
      where: { ...noPeriodo, status: 'PAGO' },
      _sum: { valorTotalCentavos: true },
      _count: true,
    }),
    prisma.venda.aggregate({
      where: { ...noPeriodo, status: { in: ['ABERTO', 'CONCLUIDO'] } },
      _sum: { valorTotalCentavos: true },
      _count: true,
    }),
    prisma.despesa.aggregate({ where: { ...noPeriodo, pago: true }, _sum: { valorCentavos: true } }),
    prisma.despesa.aggregate({ where: { ...noPeriodo, pago: false }, _sum: { valorCentavos: true } }),
  ]);

  const entradas = pagas._sum.valorTotalCentavos ?? 0;
  const saidas = despesasPagas._sum.valorCentavos ?? 0;
  return {
    de,
    ate,
    entradasCentavos: entradas,
    vendasPagas: pagas._count,
    porFormaPagamento: porForma
      .map((f) => ({ formaPagamento: f.formaPagamento, totalCentavos: f._sum.valorTotalCentavos ?? 0, quantidade: f._count }))
      .sort((a, b) => b.totalCentavos - a.totalCentavos),
    aReceberCentavos: aReceber._sum.valorTotalCentavos ?? 0,
    vendasAReceber: aReceber._count,
    despesasPagasCentavos: saidas,
    despesasPendentesCentavos: despesasPendentes._sum.valorCentavos ?? 0,
    saldoCentavos: entradas - saidas,
  };
}

// Tela Relatórios: vendas do período (exceto canceladas).
export async function relatorioVendas(deIn?: Date, ateIn?: Date) {
  const { de, ate } = periodo(deIn, ateIn);
  const where: Prisma.VendaWhereInput = { data: { gte: de, lte: ate }, status: { not: 'CANCELADO' } };

  const [totais, vendas, produtos, servicos] = await Promise.all([
    prisma.venda.aggregate({
      where,
      _sum: { valorTotalCentavos: true, totalProdutosCentavos: true, totalServicosCentavos: true, descontoCentavos: true },
      _count: true,
    }),
    prisma.venda.findMany({ where, select: { data: true, valorTotalCentavos: true } }),
    prisma.itemVenda.groupBy({
      by: ['descricao'],
      where: { venda: where, tipo: 'PRODUTO' },
      _sum: { quantidade: true, valorTotalCentavos: true },
      orderBy: { _sum: { valorTotalCentavos: 'desc' } },
      take: 10,
    }),
    prisma.itemVenda.groupBy({
      by: ['descricao'],
      where: { venda: where, tipo: 'SERVICO' },
      _sum: { quantidade: true, valorTotalCentavos: true },
      orderBy: { _sum: { valorTotalCentavos: 'desc' } },
      take: 10,
    }),
  ]);

  const porDia = new Map<string, { totalCentavos: number; vendas: number }>();
  for (const v of vendas) {
    const dia = porDia.get(chaveDia(v.data)) ?? { totalCentavos: 0, vendas: 0 };
    dia.totalCentavos += v.valorTotalCentavos;
    dia.vendas += 1;
    porDia.set(chaveDia(v.data), dia);
  }

  const total = totais._sum.valorTotalCentavos ?? 0;
  const ranking = (lista: typeof produtos) =>
    lista.map((i) => ({ descricao: i.descricao, quantidade: i._sum.quantidade ?? 0, totalCentavos: i._sum.valorTotalCentavos ?? 0 }));

  return {
    de,
    ate,
    totalCentavos: total,
    vendas: totais._count,
    ticketMedioCentavos: totais._count ? Math.round(total / totais._count) : 0,
    produtosCentavos: totais._sum.totalProdutosCentavos ?? 0,
    servicosCentavos: totais._sum.totalServicosCentavos ?? 0,
    descontosCentavos: totais._sum.descontoCentavos ?? 0,
    porDia: [...porDia].map(([dia, v]) => ({ dia, ...v })).sort((a, b) => a.dia.localeCompare(b.dia)),
    topProdutos: ranking(produtos),
    topServicos: ranking(servicos),
  };
}
