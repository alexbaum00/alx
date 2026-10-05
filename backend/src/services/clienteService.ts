import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError, NotFoundError } from '../lib/errors.js';
import type { ClienteCreate, ClienteUpdate } from '../schemas/cliente.js';

export async function listar(params: { busca?: string; pagina: number; porPagina: number }) {
  const { busca, pagina, porPagina } = params;
  const where: Prisma.ClienteWhereInput = busca
    ? {
        OR: [
          { nome: { contains: busca } },
          { cpfCnpj: { contains: busca.replace(/\D/g, '') || busca } },
          { telefone: { contains: busca } },
          { veiculos: { some: { placa: { contains: busca.toUpperCase() } } } },
        ],
      }
    : {};
  const [itens, total] = await prisma.$transaction([
    prisma.cliente.findMany({
      where,
      orderBy: { nome: 'asc' },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      include: { veiculos: { select: { id: true, placa: true, modelo: true } } },
    }),
    prisma.cliente.count({ where }),
  ]);
  return { itens, total, pagina, porPagina };
}

export async function buscarPorId(id: number) {
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: { veiculos: true, vendas: { orderBy: { data: 'desc' }, take: 10 } },
  });
  if (!cliente) throw new NotFoundError('Cliente');
  return cliente;
}

export function criar(data: ClienteCreate) {
  return prisma.cliente.create({ data });
}

export async function atualizar(id: number, data: ClienteUpdate) {
  await buscarPorId(id);
  return prisma.cliente.update({ where: { id }, data });
}

export async function remover(id: number) {
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: { _count: { select: { vendas: true, veiculos: true } } },
  });
  if (!cliente) throw new NotFoundError('Cliente');
  if (cliente._count.vendas > 0 || cliente._count.veiculos > 0) {
    throw new AppError('Cliente possui veículos ou vendas vinculados e não pode ser excluído', 409);
  }
  await prisma.cliente.delete({ where: { id } });
}
