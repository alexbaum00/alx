import Fastify, { type FastifyServerOptions } from 'fastify';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from './lib/errors.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes, protegerApi } from './routes/auth.js';
import { sistemaRoutes } from './routes/sistema.js';
import { imagemRoutes } from './routes/imagens.js';
import { clienteRoutes } from './routes/clientes.js';
import {
  despesaRoutes,
  empresaRoutes,
  ferramentaRoutes,
  fornecedorRoutes,
  procedimentoRoutes,
  produtoRoutes,
  servicoRoutes,
  veiculoRoutes,
} from './routes/cadastros.js';
import { dashboardRoutes, orcamentoRoutes, relatorioRoutes, vendaRoutes } from './routes/vendas.js';

// autenticacao: false só nos testes das regras de negócio (os testes de login usam o padrão).
export async function buildApp({ autenticacao = true, ...opts }: FastifyServerOptions & { autenticacao?: boolean } = {}) {
  const app = Fastify(opts);

  // Tela e API ficam na mesma origem, então não há CORS: outros sites não leem a API.
  await app.register(cookie);
  if (autenticacao) protegerApi(app);

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
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' });
  await app.register(clienteRoutes, { prefix: '/api/clientes' });
  await app.register(veiculoRoutes, { prefix: '/api/veiculos' });
  await app.register(fornecedorRoutes, { prefix: '/api/fornecedores' });
  await app.register(produtoRoutes, { prefix: '/api/produtos' });
  await app.register(servicoRoutes, { prefix: '/api/servicos' });
  await app.register(procedimentoRoutes, { prefix: '/api/procedimentos' });
  await app.register(vendaRoutes, { prefix: '/api/vendas' });
  await app.register(orcamentoRoutes, { prefix: '/api/orcamentos' });
  await app.register(despesaRoutes, { prefix: '/api/despesas' });
  await app.register(empresaRoutes, { prefix: '/api/empresa' });
  await app.register(relatorioRoutes, { prefix: '/api/relatorios' });
  await app.register(sistemaRoutes, { prefix: '/api/sistema' });
  await app.register(imagemRoutes, { prefix: '/api/imagens' });
  await app.register(ferramentaRoutes, { prefix: '/api/ferramentas' });

  // Em produção, o mesmo servidor entrega o frontend compilado (uma porta só no celular).
  const frontend = resolve(import.meta.dirname, '..', '..', 'frontend', 'dist');
  if (existsSync(frontend)) {
    await app.register(fastifyStatic, { root: frontend });
    app.setNotFoundHandler((req, reply) => {
      if (req.method === 'GET' && !req.url.startsWith('/api/')) return reply.sendFile('index.html');
      return reply.code(404).send({ erro: 'Rota não encontrada' });
    });
  }

  return app;
}
