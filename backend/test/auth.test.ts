import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { zerarTentativas } from '../src/lib/tentativas.js';
import { limparBanco } from './helpers.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp(); // com autenticação, como em produção
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await limparBanco();
  zerarTentativas();
});

const LOCAL = '127.0.0.1';
const CELULAR = '192.168.1.50';

async function req(method: 'GET' | 'POST', url: string, opts: { payload?: object; cookie?: string; ip?: string } = {}) {
  return app.inject({
    method,
    url,
    payload: opts.payload,
    remoteAddress: opts.ip ?? LOCAL,
    headers: opts.cookie ? { cookie: opts.cookie } : {},
  });
}

const cookieDe = (res: Awaited<ReturnType<typeof req>>) => {
  const c = res.cookies.find((x) => x.name === 'alx_sessao');
  return c ? `alx_sessao=${c.value}` : '';
};

describe('autenticação', () => {
  it('bloqueia a API sem login, mas deixa health e estado abertos', async () => {
    expect((await req('GET', '/api/clientes')).statusCode).toBe(401);
    expect((await req('GET', '/api/dashboard/stats')).statusCode).toBe(401);
    expect((await req('GET', '/api/health')).statusCode).toBe(200);
    expect((await req('GET', '/api/auth/estado')).json()).toEqual({ senhaDefinida: false, autenticado: false, acessoLocal: true });
  });

  it('primeira senha só pode ser criada no computador da oficina', async () => {
    const pelaRede = await req('POST', '/api/auth/definir-senha', { payload: { senha: '1234' }, ip: CELULAR });
    expect(pelaRede.statusCode).toBe(403);

    const local = await req('POST', '/api/auth/definir-senha', { payload: { senha: '1234' } });
    expect(local.statusCode).toBe(200);
    const cookie = local.cookies.find((c) => c.name === 'alx_sessao')!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe('Lax');
    expect((await req('GET', '/api/clientes', { cookie: cookieDe(local) })).statusCode).toBe(200);

    // não dá para redefinir por cima
    expect((await req('POST', '/api/auth/definir-senha', { payload: { senha: '9999' } })).statusCode).toBe(409);

    const acesso = await prisma.acesso.findFirstOrThrow();
    expect(acesso.senhaHash).not.toContain('1234');
    expect(acesso.senhaHash.startsWith('scrypt$')).toBe(true);
  });

  it('entra pelo celular com a senha certa e sai', async () => {
    await req('POST', '/api/auth/definir-senha', { payload: { senha: 'oficina2026' } });

    expect((await req('POST', '/api/auth/entrar', { payload: { senha: 'errada' }, ip: CELULAR })).statusCode).toBe(401);
    const ok = await req('POST', '/api/auth/entrar', { payload: { senha: 'oficina2026' }, ip: CELULAR });
    expect(ok.statusCode).toBe(200);
    const cookie = cookieDe(ok);
    expect((await req('GET', '/api/auth/estado', { cookie, ip: CELULAR })).json().autenticado).toBe(true);

    await req('POST', '/api/auth/sair', { cookie, ip: CELULAR });
    expect((await req('GET', '/api/clientes', { cookie, ip: CELULAR })).statusCode).toBe(401);
  });

  it('bloqueia após 5 senhas erradas, só para aquele endereço', async () => {
    await req('POST', '/api/auth/definir-senha', { payload: { senha: '1234' } });
    for (let i = 0; i < 5; i++) await req('POST', '/api/auth/entrar', { payload: { senha: 'x' }, ip: CELULAR });
    const bloqueado = await req('POST', '/api/auth/entrar', { payload: { senha: '1234' }, ip: CELULAR });
    expect(bloqueado.statusCode).toBe(429);
    expect((await req('POST', '/api/auth/entrar', { payload: { senha: '1234' } })).statusCode).toBe(200);
  });

  it('trocar a senha derruba as outras sessões e mantém a atual', async () => {
    const pc = cookieDe(await req('POST', '/api/auth/definir-senha', { payload: { senha: '1234' } }));
    const celular = cookieDe(await req('POST', '/api/auth/entrar', { payload: { senha: '1234' }, ip: CELULAR }));

    expect((await req('POST', '/api/auth/trocar-senha', { cookie: pc, payload: { atual: 'errada', nova: '5678' } })).statusCode).toBe(400);
    expect((await req('POST', '/api/auth/trocar-senha', { cookie: pc, payload: { atual: '1234', nova: '5678' } })).statusCode).toBe(200);

    expect((await req('GET', '/api/clientes', { cookie: pc })).statusCode).toBe(200);
    expect((await req('GET', '/api/clientes', { cookie: celular, ip: CELULAR })).statusCode).toBe(401);
    expect((await req('POST', '/api/auth/entrar', { payload: { senha: '5678' }, ip: CELULAR })).statusCode).toBe(200);
  });

  it('sessão vencida não vale', async () => {
    const cookie = cookieDe(await req('POST', '/api/auth/definir-senha', { payload: { senha: '1234' } }));
    await prisma.sessao.updateMany({ data: { expiraEm: new Date(Date.now() - 1000) } });
    expect((await req('GET', '/api/clientes', { cookie })).statusCode).toBe(401);
  });

  it('senha curta é recusada', async () => {
    const res = await req('POST', '/api/auth/definir-senha', { payload: { senha: '12' } });
    expect(res.statusCode).toBe(400);
  });
});
