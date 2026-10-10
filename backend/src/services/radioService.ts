import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../lib/errors.js';
import type { RadioCreate, RadioUpdate } from '../schemas/cadastros.js';

export function listar() {
  return prisma.radio.findMany({ orderBy: { id: 'asc' } });
}

async function buscarPorId(id: number) {
  const radio = await prisma.radio.findUnique({ where: { id } });
  if (!radio) throw new NotFoundError('Rádio');
  return radio;
}

// Só uma rádio toca ao abrir: marcar uma desmarca as outras.
export function criar(data: RadioCreate) {
  return prisma.$transaction(async (tx) => {
    if (data.tocarAoAbrir) await tx.radio.updateMany({ data: { tocarAoAbrir: false } });
    return tx.radio.create({ data });
  });
}

export async function atualizar(id: number, data: RadioUpdate) {
  await buscarPorId(id);
  return prisma.$transaction(async (tx) => {
    if (data.tocarAoAbrir) await tx.radio.updateMany({ where: { id: { not: id } }, data: { tocarAoAbrir: false } });
    return tx.radio.update({ where: { id }, data });
  });
}

export async function remover(id: number) {
  await buscarPorId(id);
  await prisma.radio.delete({ where: { id } });
}
