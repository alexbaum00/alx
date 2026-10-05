import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../lib/errors.js';
import { paginar } from '../lib/crud.js';
import type { DespesaCreate, DespesaUpdate } from '../schemas/cadastros.js';

export async function listar(q: { busca?: string; de?: Date; ate?: Date; pagina: number; porPagina: number }) {
  const where: Prisma.DespesaWhereInput = {
    data: { gte: q.de, lte: q.ate },
    ...(q.busca && { OR: [{ descricao: { contains: q.busca } }, { categoria: { contains: q.busca } }] }),
  };
  const [itens, total, soma] = await prisma.$transaction([
    prisma.despesa.findMany({ where, orderBy: { data: 'desc' }, ...paginar(q.pagina, q.porPagina) }),
    prisma.despesa.count({ where }),
    prisma.despesa.aggregate({ where, _sum: { valorCentavos: true } }),
  ]);
  return { itens, total, totalCentavos: soma._sum.valorCentavos ?? 0, pagina: q.pagina, porPagina: q.porPagina };
}

export async function buscarPorId(id: number) {
  const despesa = await prisma.despesa.findUnique({ where: { id } });
  if (!despesa) throw new NotFoundError('Despesa');
  return despesa;
}

export function criar(data: DespesaCreate) {
  return prisma.despesa.create({ data });
}

export async function atualizar(id: number, data: DespesaUpdate) {
  await buscarPorId(id);
  return prisma.despesa.update({ where: { id }, data });
}

export async function remover(id: number) {
  await buscarPorId(id);
  await prisma.despesa.delete({ where: { id } });
}
