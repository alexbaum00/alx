import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { normalizarBusca } from '../lib/busca.js';
import { AppError, NotFoundError } from '../lib/errors.js';
import { paginar } from '../lib/crud.js';
import { validarClienteVeiculo } from './vinculosService.js';
import type { VeiculoCreate, VeiculoUpdate } from '../schemas/cadastros.js';

export async function listar(q: { busca?: string; clienteId?: number; pagina: number; porPagina: number }) {
  const where: Prisma.VeiculoWhereInput = {
    clienteId: q.clienteId,
    ...(q.busca && {
      OR: [
        { placa: { contains: q.busca.toUpperCase().replace(/[^A-Z0-9]/g, '') || q.busca } },
        { busca: { contains: normalizarBusca(q.busca) } },
        { cliente: { busca: { contains: normalizarBusca(q.busca) } } },
      ],
    }),
  };
  const [itens, total] = await prisma.$transaction([
    prisma.veiculo.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { cliente: { select: { id: true, nome: true, telefone: true } } },
      ...paginar(q.pagina, q.porPagina),
    }),
    prisma.veiculo.count({ where }),
  ]);
  return { itens, total, pagina: q.pagina, porPagina: q.porPagina };
}

export async function buscarPorId(id: number) {
  const veiculo = await prisma.veiculo.findUnique({
    where: { id },
    include: {
      cliente: true,
      vendas: { orderBy: { data: 'desc' }, take: 20, include: { itens: true } },
      procedimentos: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!veiculo) throw new NotFoundError('Veículo');
  return veiculo;
}

export async function criar(data: VeiculoCreate) {
  await validarClienteVeiculo(prisma, data.clienteId, null);
  return prisma.veiculo.create({ data });
}

export async function atualizar(id: number, data: VeiculoUpdate) {
  await buscarPorId(id);
  if (data.clienteId) await validarClienteVeiculo(prisma, data.clienteId, null);
  return prisma.veiculo.update({ where: { id }, data });
}

export async function remover(id: number) {
  const veiculo = await prisma.veiculo.findUnique({ where: { id }, include: { _count: { select: { vendas: true } } } });
  if (!veiculo) throw new NotFoundError('Veículo');
  if (veiculo._count.vendas > 0) throw new AppError('Veículo possui vendas vinculadas e não pode ser excluído', 409);
  await prisma.veiculo.delete({ where: { id } });
}
