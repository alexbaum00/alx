import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../lib/errors.js';
import { paginar } from '../lib/crud.js';
import type { ProcedimentoCreate, ProcedimentoUpdate } from '../schemas/cadastros.js';

// Busca em todos os campos de texto: "polo bateria" acha registros que tenham as duas palavras.
export async function listar(q: { busca?: string; pagina: number; porPagina: number }) {
  const palavras = q.busca?.split(/\s+/).filter(Boolean) ?? [];
  const where: Prisma.ProcedimentoWhereInput = {
    AND: palavras.map((p) => ({
      OR: [
        { modeloVeiculo: { contains: p } },
        { defeitoReclamado: { contains: p } },
        { diagnosticoEncontrado: { contains: p } },
        { solucaoAplicada: { contains: p } },
        { esquemaEletricoAnotacoes: { contains: p } },
        { tags: { contains: p } },
        { veiculo: { placa: { contains: p.toUpperCase() } } },
      ],
    })),
  };
  const [itens, total] = await prisma.$transaction([
    prisma.procedimento.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { veiculo: { select: { id: true, placa: true, modelo: true } } },
      ...paginar(q.pagina, q.porPagina),
    }),
    prisma.procedimento.count({ where }),
  ]);
  return { itens, total, pagina: q.pagina, porPagina: q.porPagina };
}

export async function buscarPorId(id: number) {
  const procedimento = await prisma.procedimento.findUnique({ where: { id }, include: { veiculo: true } });
  if (!procedimento) throw new NotFoundError('Procedimento');
  return procedimento;
}

export function criar(data: ProcedimentoCreate) {
  return prisma.procedimento.create({ data });
}

export async function atualizar(id: number, data: ProcedimentoUpdate) {
  await buscarPorId(id);
  return prisma.procedimento.update({ where: { id }, data });
}

export async function remover(id: number) {
  await buscarPorId(id);
  await prisma.procedimento.delete({ where: { id } });
}
