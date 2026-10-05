import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { normalizarBusca } from '../lib/busca.js';
import { AppError, NotFoundError } from '../lib/errors.js';
import { paginar } from '../lib/crud.js';
import { validarImagensLivres } from '../lib/imagens.js';
import type { ProdutoCreate, ProdutoUpdate } from '../schemas/cadastros.js';

const estoqueBaixoWhere: Prisma.ProdutoWhereInput = {
  ativo: true,
  estoqueAtual: { lte: prisma.produto.fields.estoqueMinimo },
};

export async function listar(q: {
  busca?: string;
  categoria?: string;
  estoqueBaixo?: boolean;
  incluirInativos?: boolean;
  pagina: number;
  porPagina: number;
}) {
  const where: Prisma.ProdutoWhereInput = {
    AND: [
      q.incluirInativos ? {} : { ativo: true },
      q.categoria ? { categoria: q.categoria } : {},
      q.estoqueBaixo ? estoqueBaixoWhere : {},
      q.busca
        ? { busca: { contains: normalizarBusca(q.busca) } } // nome, código e categoria
        : {},
    ],
  };
  const [itens, total] = await prisma.$transaction([
    prisma.produto.findMany({
      where,
      orderBy: { nome: 'asc' },
      include: { fornecedor: { select: { id: true, razaoSocial: true, nomeFantasia: true } } },
      ...paginar(q.pagina, q.porPagina),
    }),
    prisma.produto.count({ where }),
  ]);
  return { itens: itens.map(comStatus), total, pagina: q.pagina, porPagina: q.porPagina };
}

export function listarEstoqueBaixo() {
  return prisma.produto.findMany({ where: estoqueBaixoWhere, orderBy: { estoqueAtual: 'asc' } }).then((l) => l.map(comStatus));
}

export async function categorias() {
  const rows = await prisma.produto.findMany({
    where: { categoria: { not: null } },
    distinct: ['categoria'],
    select: { categoria: true },
    orderBy: { categoria: 'asc' },
  });
  return rows.map((r) => r.categoria);
}

export async function buscarPorId(id: number) {
  const produto = await prisma.produto.findUnique({
    where: { id },
    include: { fornecedor: true, movimentacoes: { orderBy: { createdAt: 'desc' }, take: 50 } },
  });
  if (!produto) throw new NotFoundError('Produto');
  return comStatus(produto);
}

async function validarFornecedor(fornecedorId: number | null | undefined) {
  if (fornecedorId != null && !(await prisma.fornecedor.findUnique({ where: { id: fornecedorId } }))) {
    throw new NotFoundError('Fornecedor');
  }
}

export async function criar({ estoqueAtual, ...data }: ProdutoCreate) {
  await validarFornecedor(data.fornecedorId);
  if (data.imagemId) await validarImagensLivres(prisma, [data.imagemId], {});
  return prisma.produto.create({
    data: {
      ...data,
      estoqueAtual,
      ...(estoqueAtual > 0 && {
        movimentacoes: {
          create: { tipo: 'ENTRADA', quantidade: estoqueAtual, custoUnitarioCentavos: data.precoCustoCentavos, motivo: 'Estoque inicial' },
        },
      }),
    },
  });
}

export async function atualizar(id: number, data: ProdutoUpdate) {
  await buscarPorId(id);
  await validarFornecedor(data.fornecedorId);
  if (data.imagemId) await validarImagensLivres(prisma, [data.imagemId], { produtoId: id });
  return prisma.produto.update({ where: { id }, data });
}

export async function remover(id: number) {
  const produto = await prisma.produto.findUnique({
    where: { id },
    include: { _count: { select: { itensVenda: true } } },
  });
  if (!produto) throw new NotFoundError('Produto');
  if (produto._count.itensVenda > 0) {
    throw new AppError('Produto já foi vendido e não pode ser excluído; desative-o no cadastro', 409);
  }
  await prisma.produto.delete({ where: { id } });
}

export async function registrarEntrada(id: number, e: { quantidade: number; custoUnitarioCentavos?: number; motivo?: string | null }) {
  await buscarPorId(id);
  return prisma.produto.update({
    where: { id },
    data: {
      estoqueAtual: { increment: e.quantidade },
      ...(e.custoUnitarioCentavos != null && { precoCustoCentavos: e.custoUnitarioCentavos }),
      movimentacoes: {
        create: { tipo: 'ENTRADA', quantidade: e.quantidade, custoUnitarioCentavos: e.custoUnitarioCentavos, motivo: e.motivo ?? 'Entrada no estoque' },
      },
    },
  });
}

export async function ajustarEstoque(id: number, a: { estoqueAtual: number; motivo: string }) {
  return prisma.$transaction(async (tx) => {
    const produto = await tx.produto.findUnique({ where: { id } });
    if (!produto) throw new NotFoundError('Produto');
    const diferenca = a.estoqueAtual - produto.estoqueAtual;
    return tx.produto.update({
      where: { id },
      data: {
        estoqueAtual: a.estoqueAtual,
        movimentacoes: { create: { tipo: 'AJUSTE', quantidade: diferenca, motivo: a.motivo } },
      },
    });
  });
}

function comStatus<T extends { estoqueAtual: number; estoqueMinimo: number }>(p: T) {
  return { ...p, estoqueBaixo: p.estoqueAtual <= p.estoqueMinimo };
}
