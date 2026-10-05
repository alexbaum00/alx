import type { Prisma, TipoItem } from '@prisma/client';
import { AppError } from '../lib/errors.js';
import type { ItemInput } from '../schemas/itens.js';

export interface ItemCalculado {
  tipo: TipoItem;
  produtoId: number | null;
  servicoId: number | null;
  descricao: string;
  quantidade: number;
  valorUnitarioCentavos: number;
  valorTotalCentavos: number;
}

const arredondarQtd = (q: number) => Math.round(q * 1000) / 1000;

// Completa descrição e preço a partir dos cadastros e calcula os totais.
// Usado por vendas e orçamentos.
export async function calcularItens(tx: Prisma.TransactionClient, itens: ItemInput[], descontoCentavos = 0) {
  const produtoIds = itens.flatMap((i) => (i.tipo === 'PRODUTO' ? [i.produtoId] : []));
  const servicoIds = itens.flatMap((i) => (i.tipo === 'SERVICO' && i.servicoId ? [i.servicoId] : []));
  const [produtos, servicos] = await Promise.all([
    tx.produto.findMany({ where: { id: { in: produtoIds } } }),
    tx.servico.findMany({ where: { id: { in: servicoIds } } }),
  ]);
  const produtoPorId = new Map(produtos.map((p) => [p.id, p]));
  const servicoPorId = new Map(servicos.map((s) => [s.id, s]));

  const calculados: ItemCalculado[] = itens.map((item) => {
    const quantidade = arredondarQtd(item.quantidade);
    if (item.tipo === 'PRODUTO') {
      const produto = produtoPorId.get(item.produtoId);
      if (!produto) throw new AppError(`Produto ${item.produtoId} não encontrado`, 404);
      const unit = item.valorUnitarioCentavos ?? produto.precoVendaCentavos;
      return {
        tipo: 'PRODUTO',
        produtoId: produto.id,
        servicoId: null,
        descricao: item.descricao ?? produto.nome,
        quantidade,
        valorUnitarioCentavos: unit,
        valorTotalCentavos: Math.round(unit * quantidade),
      };
    }
    const servico = item.servicoId ? servicoPorId.get(item.servicoId) : undefined;
    if (item.servicoId && !servico) throw new AppError(`Serviço ${item.servicoId} não encontrado`, 404);
    const unit = item.valorUnitarioCentavos ?? servico!.precoCentavos;
    return {
      tipo: 'SERVICO',
      produtoId: null,
      servicoId: servico?.id ?? null,
      descricao: item.descricao ?? servico!.nome,
      quantidade,
      valorUnitarioCentavos: unit,
      valorTotalCentavos: Math.round(unit * quantidade),
    };
  });

  const soma = (tipo: TipoItem) =>
    calculados.filter((i) => i.tipo === tipo).reduce((t, i) => t + i.valorTotalCentavos, 0);
  const totalProdutosCentavos = soma('PRODUTO');
  const totalServicosCentavos = soma('SERVICO');
  const subtotal = totalProdutosCentavos + totalServicosCentavos;
  if (descontoCentavos > subtotal) throw new AppError('Desconto maior que o valor dos itens');

  return {
    itens: calculados,
    totais: {
      descontoCentavos,
      totalProdutosCentavos,
      totalServicosCentavos,
      valorTotalCentavos: subtotal - descontoCentavos,
    },
  };
}
