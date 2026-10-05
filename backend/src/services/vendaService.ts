import type { Prisma, StatusVenda, FormaPagamento } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { normalizarBusca } from '../lib/busca.js';
import { AppError, NotFoundError } from '../lib/errors.js';
import { paginar } from '../lib/crud.js';
import { fimDoDia, inicioDoDia } from '../lib/datas.js';
import { calcularItens } from './itensService.js';
import { validarClienteVeiculo } from './vinculosService.js';
import type { VendaCreate, VendaList, VendaUpdate } from '../schemas/vendas.js';

type Tx = Prisma.TransactionClient;

// Status em que as peças já foram usadas/entregues e saem do estoque.
const STATUS_COM_BAIXA: StatusVenda[] = ['CONCLUIDO', 'PAGO'];

const incluirDetalhes = {
  cliente: true,
  veiculo: true,
  itens: { orderBy: { id: 'asc' } },
  orcamento: { select: { id: true } },
} satisfies Prisma.VendaInclude;

export async function listar(q: VendaList) {
  const where: Prisma.VendaWhereInput = {
    status: q.status,
    clienteId: q.clienteId,
    veiculoId: q.veiculoId,
    data: { gte: q.de && inicioDoDia(q.de), lte: q.ate && fimDoDia(q.ate) },
    ...(q.busca && {
      OR: [
        { cliente: { busca: { contains: normalizarBusca(q.busca) } } },
        { veiculo: { placa: { contains: q.busca.toUpperCase() } } },
        { itens: { some: { busca: { contains: normalizarBusca(q.busca) } } } },
        ...(Number(q.busca) ? [{ id: Number(q.busca) }] : []),
      ],
    }),
  };
  const [itens, total] = await prisma.$transaction([
    prisma.venda.findMany({
      where,
      orderBy: { data: 'desc' },
      include: {
        cliente: { select: { id: true, nome: true } },
        veiculo: { select: { id: true, placa: true, modelo: true } },
      },
      ...paginar(q.pagina, q.porPagina),
    }),
    prisma.venda.count({ where }),
  ]);
  return { itens, total, pagina: q.pagina, porPagina: q.porPagina };
}

export async function buscarPorId(id: number) {
  const venda = await prisma.venda.findUnique({ where: { id }, include: incluirDetalhes });
  if (!venda) throw new NotFoundError('Venda');
  return venda;
}

export function detalhar(tx: Tx, id: number) {
  return tx.venda.findUniqueOrThrow({ where: { id }, include: incluirDetalhes });
}

export function criar(data: VendaCreate) {
  return prisma.$transaction((tx) => criarNaTransacao(tx, data));
}

export async function criarNaTransacao(tx: Tx, { itens, descontoCentavos, ...data }: VendaCreate) {
  if (data.status === 'PAGO' && !data.formaPagamento) throw new AppError('Informe a forma de pagamento');
  await validarClienteVeiculo(tx, data.clienteId, data.veiculoId);
  const calculo = await calcularItens(tx, itens, descontoCentavos);
  const venda = await tx.venda.create({
    data: { ...data, ...calculo.totais, itens: { create: calculo.itens } },
  });
  if (STATUS_COM_BAIXA.includes(venda.status)) await baixarEstoque(tx, venda.id);
  await atualizarKm(tx, data.veiculoId, data.kmEntrada);
  return detalhar(tx, venda.id);
}

export async function atualizar(id: number, { itens, ...data }: VendaUpdate) {
  return prisma.$transaction(async (tx) => {
    const atual = await tx.venda.findUnique({ where: { id } });
    if (!atual) throw new NotFoundError('Venda');
    if (atual.status === 'CANCELADO') throw new AppError('Venda cancelada não pode ser alterada');

    const clienteId = data.clienteId !== undefined ? data.clienteId : atual.clienteId;
    const veiculoId = data.veiculoId !== undefined ? data.veiculoId : atual.veiculoId;
    await validarClienteVeiculo(tx, clienteId, veiculoId);

    let totais = {};
    if (itens) {
      // troca os itens: devolve as peças antigas e baixa as novas
      if (atual.estoqueBaixado) await estornarEstoque(tx, id);
      const calculo = await calcularItens(tx, itens, data.descontoCentavos ?? atual.descontoCentavos);
      await tx.itemVenda.deleteMany({ where: { vendaId: id } });
      await tx.itemVenda.createMany({ data: calculo.itens.map((i) => ({ ...i, vendaId: id })) });
      totais = calculo.totais;
    } else if (data.descontoCentavos !== undefined) {
      const subtotal = atual.totalProdutosCentavos + atual.totalServicosCentavos;
      if (data.descontoCentavos > subtotal) throw new AppError('Desconto maior que o valor dos itens');
      totais = { valorTotalCentavos: subtotal - data.descontoCentavos };
    }

    await tx.venda.update({ where: { id }, data: { ...data, ...totais } });
    if (itens && atual.estoqueBaixado) await baixarEstoque(tx, id);
    await atualizarKm(tx, veiculoId, data.kmEntrada);
    return detalhar(tx, id);
  });
}

export async function alterarStatus(id: number, status: StatusVenda, formaPagamento?: FormaPagamento | null) {
  return prisma.$transaction(async (tx) => {
    const venda = await tx.venda.findUnique({ where: { id } });
    if (!venda) throw new NotFoundError('Venda');
    if (venda.status === 'CANCELADO') throw new AppError('Venda cancelada não pode mudar de status');

    const pagamento = formaPagamento ?? venda.formaPagamento;
    if (status === 'PAGO' && !pagamento) throw new AppError('Informe a forma de pagamento');

    if (status === 'CANCELADO' && venda.estoqueBaixado) await estornarEstoque(tx, id);
    if (STATUS_COM_BAIXA.includes(status) && !venda.estoqueBaixado) await baixarEstoque(tx, id);

    await tx.venda.update({ where: { id }, data: { status, formaPagamento: pagamento } });
    return detalhar(tx, id);
  });
}

async function quantidadesPorProduto(tx: Tx, vendaId: number) {
  const itens = await tx.itemVenda.findMany({ where: { vendaId, tipo: 'PRODUTO', produtoId: { not: null } } });
  const mapa = new Map<number, number>();
  for (const i of itens) mapa.set(i.produtoId!, (mapa.get(i.produtoId!) ?? 0) + i.quantidade);
  return mapa;
}

async function baixarEstoque(tx: Tx, vendaId: number) {
  const quantidades = await quantidadesPorProduto(tx, vendaId);
  const produtos = await tx.produto.findMany({ where: { id: { in: [...quantidades.keys()] } } });
  const faltando = produtos.filter((p) => p.estoqueAtual < quantidades.get(p.id)!);
  if (faltando.length) {
    const lista = faltando.map((p) => `${p.nome} (disponível: ${p.estoqueAtual} ${p.unidade})`).join(', ');
    throw new AppError(`Estoque insuficiente: ${lista}. Registre a entrada no estoque antes de concluir.`, 409);
  }
  for (const [produtoId, qtd] of quantidades) {
    await tx.produto.update({
      where: { id: produtoId },
      data: {
        estoqueAtual: { decrement: qtd },
        movimentacoes: { create: { tipo: 'SAIDA', quantidade: -qtd, vendaId, motivo: `Venda #${vendaId}` } },
      },
    });
  }
  await tx.venda.update({ where: { id: vendaId }, data: { estoqueBaixado: true } });
}

async function estornarEstoque(tx: Tx, vendaId: number) {
  for (const [produtoId, qtd] of await quantidadesPorProduto(tx, vendaId)) {
    await tx.produto.update({
      where: { id: produtoId },
      data: {
        estoqueAtual: { increment: qtd },
        movimentacoes: { create: { tipo: 'ENTRADA', quantidade: qtd, vendaId, motivo: `Estorno da venda #${vendaId}` } },
      },
    });
  }
  await tx.venda.update({ where: { id: vendaId }, data: { estoqueBaixado: false } });
}

async function atualizarKm(tx: Tx, veiculoId: number | null | undefined, km: number | null | undefined) {
  if (veiculoId == null || km == null) return;
  await tx.veiculo.updateMany({
    where: { id: veiculoId, OR: [{ kmAtual: null }, { kmAtual: { lt: km } }] },
    data: { kmAtual: km },
  });
}
