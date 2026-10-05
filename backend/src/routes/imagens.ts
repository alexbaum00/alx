import { createReadStream } from 'node:fs';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../lib/errors.js';
import { TAMANHO_MAXIMO, caminhoImagem, salvarImagem } from '../lib/imagens.js';

export async function imagemRoutes(app: FastifyInstance) {
  // A tela envia a foto já reduzida, como bytes (Content-Type: image/jpeg).
  app.addContentTypeParser(/^image\//, { parseAs: 'buffer', bodyLimit: TAMANHO_MAXIMO }, (_req, corpo, pronto) => pronto(null, corpo));

  app.post('/', async (req, reply) => {
    const imagem = await salvarImagem(req.body as Buffer);
    return reply.code(201).send({ id: imagem.id, url: `/api/imagens/${imagem.id}` });
  });

  app.get('/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string().regex(/^[a-f0-9]{32}$/) }).parse(req.params);
    const imagem = await prisma.imagem.findUnique({ where: { id } });
    if (!imagem) throw new NotFoundError('Imagem');
    // o id é aleatório e a foto nunca muda: o navegador pode guardar para sempre
    reply.header('Cache-Control', 'private, max-age=31536000, immutable');
    reply.header('X-Content-Type-Options', 'nosniff');
    return reply.type(imagem.mime).send(createReadStream(caminhoImagem(imagem.arquivo)));
  });
}
