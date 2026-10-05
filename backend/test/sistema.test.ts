import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { fazerBackup, listarBackups } from '../src/lib/backup.js';

let app: FastifyInstance;
const pasta = mkdtempSync(join(tmpdir(), 'alx-backup-'));

beforeAll(async () => {
  app = await buildApp({ autenticacao: false });
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
  rmSync(pasta, { recursive: true, force: true });
});

describe('backup', () => {
  it('gera cópias legíveis, aguenta vários no mesmo segundo e mantém só as mais novas', async () => {
    await prisma.cliente.create({ data: { nome: 'Cliente do backup' } });
    for (let i = 0; i < 4; i++) await fazerBackup(pasta, 3);

    const arquivos = readdirSync(pasta).filter((a) => a.endsWith('.db'));
    expect(arquivos).toHaveLength(3);
    expect(listarBackups(pasta)).toHaveLength(3);

    // o arquivo é um banco SQLite válido com os dados
    const { PrismaClient } = await import('@prisma/client');
    const copia = new PrismaClient({ datasourceUrl: `file:${join(pasta, listarBackups(pasta)[0].arquivo)}` });
    expect(await copia.cliente.count({ where: { nome: 'Cliente do backup' } })).toBe(1);
    await copia.$disconnect();
  });
});

describe('sistema', () => {
  it('lista endereços de acesso com QR code em SVG', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/sistema/acesso' });
    expect(res.statusCode).toBe(200);
    for (const e of res.json().enderecos) {
      expect(e.url).toMatch(/^http:\/\/\d+\.\d+\.\d+\.\d+:\d+$/);
      expect(e.qrSvg).toContain('<svg');
    }
  });

  it('rotas de sistema exigem login', async () => {
    const protegido = await buildApp();
    expect((await protegido.inject({ method: 'POST', url: '/api/sistema/backup' })).statusCode).toBe(401);
    await protegido.close();
  });
});
