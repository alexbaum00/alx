import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { normalizarBusca } from '../lib/busca.js';
import { NotFoundError } from '../lib/errors.js';
import { paginar } from '../lib/crud.js';
import { validarImagensLivres } from '../lib/imagens.js';
import type { ProcedimentoCreate, ProcedimentoUpdate } from '../schemas/cadastros.js';

// Busca em todos os campos de texto: "polo bateria" acha registros que tenham as duas palavras.
export async function listar(q: { busca?: string; pagina: number; porPagina: number }) {
  const palavras = q.busca?.split(/\s+/).filter(Boolean) ?? [];
  const where: Prisma.ProcedimentoWhereInput = {
    AND: palavras.map((p) => ({
      OR: [
        { busca: { contains: normalizarBusca(p) } },
        { veiculo: { placa: { contains: p.toUpperCase() } } },
      ],
    })),
  };
  const [itens, total] = await prisma.$transaction([
    prisma.procedimento.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        veiculo: { select: { id: true, placa: true, modelo: true } },
        imagens: { select: imagemSelect, orderBy: { ordem: 'asc' } },
      },
      ...paginar(q.pagina, q.porPagina),
    }),
    prisma.procedimento.count({ where }),
  ]);
  return { itens, total, pagina: q.pagina, porPagina: q.porPagina };
}

export async function buscarPorId(id: number) {
  const procedimento = await prisma.procedimento.findUnique({
    where: { id },
    include: { veiculo: true, imagens: { select: imagemSelect, orderBy: { ordem: 'asc' } } },
  });
  if (!procedimento) throw new NotFoundError('Procedimento');
  return procedimento;
}

const imagemSelect = { id: true, legenda: true } satisfies Prisma.ImagemSelect;

// Liga as fotos ao procedimento na ordem recebida; as que saíram da lista ficam sem dono
// e a limpeza automática apaga depois de 24 h.
async function sincronizarImagens(tx: Prisma.TransactionClient, procedimentoId: number, imagens: NonNullable<ProcedimentoCreate['imagens']>) {
  const ids = imagens.map((i) => i.id);
  await validarImagensLivres(tx, ids, { procedimentoId });
  await tx.imagem.updateMany({ where: { procedimentoId, id: { notIn: ids } }, data: { procedimentoId: null } });
  for (const [ordem, img] of imagens.entries()) {
    await tx.imagem.update({ where: { id: img.id }, data: { procedimentoId, ordem, legenda: img.legenda ?? null } });
  }
}

export function criar({ imagens, ...data }: ProcedimentoCreate) {
  return prisma.$transaction(async (tx) => {
    const p = await tx.procedimento.create({ data });
    if (imagens) await sincronizarImagens(tx, p.id, imagens);
    return tx.procedimento.findUniqueOrThrow({ where: { id: p.id }, include: { imagens: { select: imagemSelect, orderBy: { ordem: 'asc' } } } });
  });
}

export async function atualizar(id: number, { imagens, ...data }: ProcedimentoUpdate) {
  await buscarPorId(id);
  return prisma.$transaction(async (tx) => {
    await tx.procedimento.update({ where: { id }, data });
    if (imagens) await sincronizarImagens(tx, id, imagens);
    return tx.procedimento.findUniqueOrThrow({ where: { id }, include: { imagens: { select: imagemSelect, orderBy: { ordem: 'asc' } } } });
  });
}

export async function remover(id: number) {
  await buscarPorId(id);
  await prisma.procedimento.delete({ where: { id } });
}
