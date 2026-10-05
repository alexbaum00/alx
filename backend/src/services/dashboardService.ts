import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { inicioDoDia } from '../lib/datas.js';

// Dados da tela Início: os 4 cards e as tabelas do layout.
export async function estatisticas() {
  const vendasDoDia: Prisma.VendaWhereInput = { data: { gte: inicioDoDia() }, status: { not: 'CANCELADO' } };
  const estoqueBaixo: Prisma.ProdutoWhereInput = { ativo: true, estoqueAtual: { lte: prisma.produto.fields.estoqueMinimo } };

  const [vendas, produtosVendidos, servicos, baixoCount, baixos, recentes, veiculos] = await Promise.all([
    prisma.venda.aggregate({ where: vendasDoDia, _sum: { valorTotalCentavos: true }, _count: true }),
    prisma.itemVenda.aggregate({ where: { venda: vendasDoDia, tipo: 'PRODUTO' }, _sum: { quantidade: true } }),
    prisma.itemVenda.count({ where: { venda: vendasDoDia, tipo: 'SERVICO' } }),
    prisma.produto.count({ where: estoqueBaixo }),
    prisma.produto.findMany({ where: estoqueBaixo, orderBy: { estoqueAtual: 'asc' }, take: 5 }),
    prisma.venda.findMany({
      orderBy: { data: 'desc' },
      take: 5,
      select: { id: true, data: true, status: true, valorTotalCentavos: true, cliente: { select: { id: true, nome: true } } },
    }),
    prisma.venda.findMany({
      where: { veiculoId: { not: null } },
      orderBy: { data: 'desc' },
      distinct: ['veiculoId'],
      take: 5,
      select: {
        id: true,
        data: true,
        veiculo: { select: { id: true, placa: true, marca: true, modelo: true } },
        itens: { where: { tipo: 'SERVICO' }, select: { descricao: true }, take: 1 },
      },
    }),
  ]);

  // Lista "Produtos em Estoque": os mais críticos primeiro, completando com os demais.
  const outros =
    baixos.length < 5
      ? await prisma.produto.findMany({
          where: { ativo: true, id: { notIn: baixos.map((p) => p.id) } },
          orderBy: { nome: 'asc' },
          take: 5 - baixos.length,
        })
      : [];

  return {
    vendasHoje: { totalCentavos: vendas._sum.valorTotalCentavos ?? 0, atendimentos: vendas._count },
    produtosVendidosHoje: produtosVendidos._sum.quantidade ?? 0,
    servicosHoje: servicos,
    estoqueBaixo: baixoCount,
    vendasRecentes: recentes,
    produtosEstoque: [...baixos, ...outros].map((p) => ({
      id: p.id,
      nome: p.nome,
      categoria: p.categoria,
      unidade: p.unidade,
      estoqueAtual: p.estoqueAtual,
      estoqueMinimo: p.estoqueMinimo,
      estoqueBaixo: p.estoqueAtual <= p.estoqueMinimo,
      imagemId: p.imagemId,
    })),
    veiculosRecentes: veiculos.map((v) => ({
      vendaId: v.id,
      data: v.data,
      ...v.veiculo!,
      servico: v.itens[0]?.descricao ?? null,
    })),
  };
}
