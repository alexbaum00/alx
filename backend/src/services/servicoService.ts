import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../lib/errors.js';
import { paginar } from '../lib/crud.js';
import type { ServicoCreate, ServicoList, ServicoUpdate } from '../schemas/cadastros.js';

export async function listar(q: ServicoList) {
  const where = {
    categoria: q.categoria,
    ...(q.busca && { OR: [{ nome: { contains: q.busca } }, { descricao: { contains: q.busca } }] }),
  };
  const [itens, total] = await prisma.$transaction([
    prisma.servico.findMany({ where, orderBy: { nome: 'asc' }, ...paginar(q.pagina, q.porPagina) }),
    prisma.servico.count({ where }),
  ]);
  return { itens, total, pagina: q.pagina, porPagina: q.porPagina };
}

export async function buscarPorId(id: number) {
  const servico = await prisma.servico.findUnique({ where: { id } });
  if (!servico) throw new NotFoundError('Serviço');
  return servico;
}

export function criar(data: ServicoCreate) {
  return prisma.servico.create({ data });
}

export async function atualizar(id: number, data: ServicoUpdate) {
  await buscarPorId(id);
  return prisma.servico.update({ where: { id }, data });
}

// Itens de vendas antigas mantêm a descrição gravada (onDelete: SetNull).
export async function remover(id: number) {
  await buscarPorId(id);
  await prisma.servico.delete({ where: { id } });
}
