import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import * as authService from '../services/authService.js';

export const COOKIE_SESSAO = 'alx_sessao';

const senha = z.string().min(4, 'Use pelo menos 4 caracteres').max(100);

const IPS_LOCAIS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
export const ehAcessoLocal = (req: FastifyRequest) => IPS_LOCAIS.has(req.ip);

function gravarCookie(reply: FastifyReply, token: string) {
  // Sem "secure": na rede local o acesso é por http://IP. SameSite=Lax bloqueia envio por outros sites.
  reply.setCookie(COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: authService.DURACAO_SESSAO_MS / 1000,
  });
}

export async function authRoutes(app: FastifyInstance) {
  app.get('/estado', async (req) => ({
    senhaDefinida: await authService.senhaDefinida(),
    autenticado: Boolean(await authService.validarSessao(req.cookies[COOKIE_SESSAO])),
    acessoLocal: ehAcessoLocal(req),
  }));

  app.post('/definir-senha', async (req, reply) => {
    const corpo = z.object({ senha }).parse(req.body);
    gravarCookie(reply, await authService.definirPrimeiraSenha(corpo.senha, ehAcessoLocal(req), req.headers['user-agent']));
    return { ok: true };
  });

  app.post('/entrar', async (req, reply) => {
    const corpo = z.object({ senha: z.string().min(1, 'Digite a senha') }).parse(req.body);
    gravarCookie(reply, await authService.entrar(corpo.senha, req.ip, req.headers['user-agent']));
    return { ok: true };
  });

  app.post('/sair', async (req, reply) => {
    await authService.sair(req.cookies[COOKIE_SESSAO]);
    reply.clearCookie(COOKIE_SESSAO, { path: '/' });
    return { ok: true };
  });

  app.post('/trocar-senha', async (req, reply) => {
    const token = req.cookies[COOKIE_SESSAO];
    if (!(await authService.validarSessao(token))) return reply.code(401).send({ erro: 'Faça login para continuar' });
    const corpo = z.object({ atual: z.string().min(1, 'Digite a senha atual'), nova: senha }).parse(req.body);
    await authService.trocarSenha(corpo.atual, corpo.nova, token!);
    return { ok: true };
  });
}

// Rotas da API abertas sem login.
const PUBLICAS = ['/api/health', '/api/auth/'];

export function protegerApi(app: FastifyInstance) {
  app.addHook('onRequest', async (req, reply) => {
    const caminho = req.url.split('?')[0];
    if (!caminho.startsWith('/api/') || PUBLICAS.some((p) => caminho.startsWith(p))) return;
    if (!(await authService.validarSessao(req.cookies[COOKIE_SESSAO]))) {
      return reply.code(401).send({ erro: 'Faça login para continuar' });
    }
  });
}
