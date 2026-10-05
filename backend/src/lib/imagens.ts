import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Prisma } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from './prisma.js';
import { AppError } from './errors.js';

export const TAMANHO_MAXIMO = 15 * 1024 * 1024;
const PRAZO_ORFA_MS = 24 * 60 * 60 * 1000;

export const pastaImagens = () => resolve(env.IMAGENS_DIR || resolve(import.meta.dirname, '..', '..', '..', 'imagens'));

// Confere o tipo pelos primeiros bytes do arquivo, não pelo que o navegador diz.
export function detectarTipo(b: Buffer): { mime: string; extensao: string } | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', extensao: 'jpg' };
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', extensao: 'png' };
  if (b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return { mime: 'image/webp', extensao: 'webp' };
  return null;
}

// Grava o arquivo e registra a imagem ainda sem dono; o formulário a vincula ao salvar.
export async function salvarImagem(conteudo: Buffer) {
  const tipo = detectarTipo(conteudo);
  if (!tipo) throw new AppError('Envie uma foto em JPG, PNG ou WebP', 415);
  const id = randomBytes(16).toString('hex');
  const arquivo = `${id}.${tipo.extensao}`;
  mkdirSync(pastaImagens(), { recursive: true });
  writeFileSync(resolve(pastaImagens(), arquivo), conteudo);
  return prisma.imagem.create({ data: { id, arquivo, mime: tipo.mime, tamanhoBytes: conteudo.length } });
}

export const caminhoImagem = (arquivo: string) => resolve(pastaImagens(), arquivo);

// Confere se as imagens existem e não pertencem a outro registro.
export async function validarImagensLivres(
  tx: Prisma.TransactionClient,
  ids: string[],
  dono: { procedimentoId?: number; produtoId?: number; ferramentaId?: number },
) {
  if (!ids.length) return;
  const imagens = await tx.imagem.findMany({
    where: { id: { in: ids } },
    include: { produto: { select: { id: true } }, ferramenta: { select: { id: true } } },
  });
  if (imagens.length !== new Set(ids).size) throw new AppError('Imagem não encontrada; envie a foto de novo', 400);
  for (const img of imagens) {
    const ocupada =
      (img.procedimentoId != null && img.procedimentoId !== dono.procedimentoId) ||
      (img.produto != null && img.produto.id !== dono.produtoId) ||
      (img.ferramenta != null && img.ferramenta.id !== dono.ferramentaId);
    if (ocupada) throw new AppError('Esta imagem já pertence a outro registro', 400);
  }
}

// Apaga fotos sem dono há mais de 24 h (trocadas, removidas ou de formulários cancelados)
// e arquivos que ficaram sem registro (ex.: procedimento excluído).
export async function limparImagensOrfas(agora = Date.now()) {
  const limite = new Date(agora - PRAZO_ORFA_MS);
  const orfas = await prisma.imagem.findMany({
    where: { procedimentoId: null, produto: null, ferramenta: null, criadaEm: { lt: limite } },
  });
  for (const img of orfas) rmSync(caminhoImagem(img.arquivo), { force: true });
  await prisma.imagem.deleteMany({ where: { id: { in: orfas.map((i) => i.id) } } });

  const pasta = pastaImagens();
  if (!existsSync(pasta)) return orfas.length;
  const conhecidos = new Set((await prisma.imagem.findMany({ select: { arquivo: true } })).map((i) => i.arquivo));
  let soltos = 0;
  for (const arquivo of readdirSync(pasta)) {
    const caminho = resolve(pasta, arquivo);
    if (!conhecidos.has(arquivo) && statSync(caminho).mtimeMs < limite.getTime()) {
      rmSync(caminho, { force: true });
      soltos++;
    }
  }
  return orfas.length + soltos;
}
