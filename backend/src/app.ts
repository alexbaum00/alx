import Fastify, { type FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from './lib/errors.js';
import { healthRoutes } from './routes/health.js';
import { clienteRoutes } from './routes/clientes.js';

export async function buildApp(opts: FastifyServerOptions = {}) {
  const app = Fastify(opts);

  await app.register(cors, { origin: true });

  app.setErrorHandler((error, req, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        erro: 'Dados inválidos',
        campos: error.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message })),
      });
    }
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({ erro: error.message });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const campos = (error.meta?.target as string[] | undefined)?.join(', ');
        return reply.code(409).send({ erro: `Já existe um registro com este valor${campos ? ` (${campos})` : ''}` });
      }
      if (error.code === 'P2025') return reply.code(404).send({ erro: 'Registro não encontrado' });
      if (error.code === 'P2003') return reply.code(409).send({ erro: 'Registro vinculado a outros dados' });
    }
    const status = (error as { statusCode?: number }).statusCode;
    if (status && status < 500) return reply.code(status).send({ erro: (error as Error).message });
    req.log.error(error);
    return reply.code(500).send({ erro: 'Erro interno do servidor' });
  });

  await app.register(healthRoutes, { prefix: '/api/health' });
  await app.register(clienteRoutes, { prefix: '/api/clientes' });

  return app;
}
