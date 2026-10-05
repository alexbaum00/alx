import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../lib/errors.js';
import { paginar } from '../lib/crud.js';
import { validarImagensLivres } from '../lib/imagens.js';
import type { FerramentaCreate, FerramentaList, FerramentaUpdate } from '../schemas/cadastros.js';

export async function listar(q: FerramentaList) {
  const where: Prisma.FerramentaWhereInput = {
    AND: [
      q.incluirDescartadas ? {} : { estado: { not: 'DESCARTADA' } },
      q.categoria ? { categoria: q.categoria } : {},
      q.busca
        ? {
            OR: [
              { nome: { contains: q.busca } },
              { marca: { contains: q.busca } },
              { modelo: { contains: q.busca } },
              { categoria: { contains: q.busca } },
              { numeroSerie: { contains: q.busca } },
              { localizacao: { contains: q.busca } },
            ],
          }
        : {},
    ],
  };
  const [itens, total] = await prisma.$transaction([
    prisma.ferramenta.findMany({ where, orderBy: [{ categoria: 'asc' }, { nome: 'asc' }], ...paginar(q.pagina, q.porPagina) }),
    prisma.ferramenta.count({ where }),
  ]);
  return { itens, total, pagina: q.pagina, porPagina: q.porPagina };
}

export async function buscarPorId(id: number) {
  const ferramenta = await prisma.ferramenta.findUnique({ where: { id } });
  if (!ferramenta) throw new NotFoundError('Ferramenta');
  return ferramenta;
}

export async function criar(data: FerramentaCreate) {
  if (data.imagemId) await validarImagensLivres(prisma, [data.imagemId], {});
  return prisma.ferramenta.create({ data });
}

export async function atualizar(id: number, data: FerramentaUpdate) {
  await buscarPorId(id);
  if (data.imagemId) await validarImagensLivres(prisma, [data.imagemId], { ferramentaId: id });
  return prisma.ferramenta.update({ where: { id }, data });
}

export async function remover(id: number) {
  await buscarPorId(id);
  await prisma.ferramenta.delete({ where: { id } });
}

// Quanto já foi investido: valor × quantidade, sem contar as descartadas.
export async function resumo() {
  const ferramentas = await prisma.ferramenta.findMany({
    where: { estado: { not: 'DESCARTADA' } },
    select: { categoria: true, quantidade: true, valorCompraCentavos: true, estado: true, garantiaAte: true },
  });
  const porCategoria = new Map<string, { categoria: string; itens: number; totalCentavos: number }>();
  let totalCentavos = 0;
  let unidades = 0;
  for (const f of ferramentas) {
    const valor = f.valorCompraCentavos * f.quantidade;
    totalCentavos += valor;
    unidades += f.quantidade;
    const nome = f.categoria ?? 'Sem categoria';
    const c = porCategoria.get(nome) ?? { categoria: nome, itens: 0, totalCentavos: 0 };
    c.itens += f.quantidade;
    c.totalCentavos += valor;
    porCategoria.set(nome, c);
  }
  const hoje = new Date();
  return {
    totalCentavos,
    cadastradas: ferramentas.length,
    unidades,
    emManutencao: ferramentas.filter((f) => f.estado === 'MANUTENCAO').length,
    emGarantia: ferramentas.filter((f) => f.garantiaAte && f.garantiaAte >= hoje).length,
    porCategoria: [...porCategoria.values()].sort((a, b) => b.totalCentavos - a.totalCentavos),
  };
}
