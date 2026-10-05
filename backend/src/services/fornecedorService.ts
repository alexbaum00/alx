import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { normalizarBusca } from '../lib/busca.js';
import { NotFoundError } from '../lib/errors.js';
import { paginar } from '../lib/crud.js';
import type { FornecedorCreate, FornecedorUpdate } from '../schemas/cadastros.js';

export async function listar(q: { busca?: string; pagina: number; porPagina: number }) {
  const where: Prisma.FornecedorWhereInput = q.busca
    ? {
        OR: [
          { busca: { contains: normalizarBusca(q.busca) } },
          { cnpj: { contains: q.busca.replace(/\D/g, '') || q.busca } },
        ],
      }
    : {};
  const [itens, total] = await prisma.$transaction([
    prisma.fornecedor.findMany({
      where,
      orderBy: { razaoSocial: 'asc' },
      include: { _count: { select: { produtos: true } } },
      ...paginar(q.pagina, q.porPagina),
    }),
    prisma.fornecedor.count({ where }),
  ]);
  return { itens, total, pagina: q.pagina, porPagina: q.porPagina };
}

export async function buscarPorId(id: number) {
  const fornecedor = await prisma.fornecedor.findUnique({ where: { id }, include: { produtos: true } });
  if (!fornecedor) throw new NotFoundError('Fornecedor');
  return fornecedor;
}

export function criar(data: FornecedorCreate) {
  return prisma.fornecedor.create({ data });
}

export async function atualizar(id: number, data: FornecedorUpdate) {
  await buscarPorId(id);
  return prisma.fornecedor.update({ where: { id }, data });
}

// Produtos do fornecedor ficam sem fornecedor (onDelete: SetNull).
export async function remover(id: number) {
  await buscarPorId(id);
  await prisma.fornecedor.delete({ where: { id } });
}
