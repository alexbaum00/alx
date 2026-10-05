import { existsSync, mkdtempSync, readdirSync, rmSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { caminhoImagem, limparImagensOrfas, pastaImagens } from '../src/lib/imagens.js';
import { copiarImagensNovas } from '../src/lib/backup.js';
import { limparBanco } from './helpers.js';

let app: FastifyInstance;

// JPEG mínimo (o servidor só confere a assinatura do arquivo)
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 7), Buffer.from([0xff, 0xd9])]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)]);

beforeAll(async () => {
  app = await buildApp({ autenticacao: false });
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

beforeEach(limparBanco);

const enviar = (corpo: Buffer, tipo = 'image/jpeg') =>
  app.inject({ method: 'POST', url: '/api/imagens', payload: corpo, headers: { 'content-type': tipo } });

const novaImagem = async (corpo = JPEG) => (await enviar(corpo)).json() as { id: string; url: string };

describe('imagens', () => {
  it('recebe JPG/PNG pela assinatura do arquivo e serve de volta', async () => {
    const res = await enviar(JPEG);
    expect(res.statusCode).toBe(201);
    const { id, url } = res.json();
    expect(url).toBe(`/api/imagens/${id}`);
    expect(existsSync(caminhoImagem(`${id}.jpg`))).toBe(true);

    const volta = await app.inject({ method: 'GET', url });
    expect(volta.statusCode).toBe(200);
    expect(volta.headers['content-type']).toBe('image/jpeg');
    expect(volta.headers['cache-control']).toContain('immutable');
    expect(volta.rawPayload.equals(JPEG)).toBe(true);

    expect((await enviar(PNG, 'image/png')).statusCode).toBe(201);
  });

  it('recusa arquivo que não é foto, mesmo dizendo que é', async () => {
    const res = await enviar(Buffer.from('<script>alert(1)</script>'), 'image/jpeg');
    expect(res.statusCode).toBe(415);
    // nome fora do padrão (ex.: tentativa de sair da pasta) é recusado antes de tocar no disco
    expect((await app.inject({ method: 'GET', url: '/api/imagens/..%2F..%2Fetc%2Fpasswd' })).statusCode).toBe(400);
  });

  it('procedimento guarda várias fotos com legenda e ordem; remover da lista desvincula', async () => {
    const [a, b, c] = [await novaImagem(), await novaImagem(), await novaImagem()];
    const criado = await app.inject({
      method: 'POST',
      url: '/api/procedimentos',
      payload: {
        modeloVeiculo: 'Gol G5',
        defeitoReclamado: 'Farol não acende',
        imagens: [{ id: b.id, legenda: 'Conector do farol' }, { id: a.id }],
      },
    });
    expect(criado.statusCode).toBe(201);
    expect(criado.json().imagens).toEqual([
      { id: b.id, legenda: 'Conector do farol' },
      { id: a.id, legenda: null },
    ]);

    const id = criado.json().id;
    const editado = await app.inject({ method: 'PUT', url: `/api/procedimentos/${id}`, payload: { imagens: [{ id: c.id }, { id: b.id, legenda: 'Pino 3' }] } });
    expect(editado.json().imagens.map((i: { id: string }) => i.id)).toEqual([c.id, b.id]);
    expect((await prisma.imagem.findUniqueOrThrow({ where: { id: a.id } })).procedimentoId).toBeNull();

    // editar só o texto mantém as fotos
    await app.inject({ method: 'PUT', url: `/api/procedimentos/${id}`, payload: { tags: 'farol' } });
    const lista = (await app.inject({ method: 'GET', url: '/api/procedimentos?busca=farol' })).json();
    expect(lista.itens[0].imagens).toHaveLength(2);
  });

  it('uma foto não pode ser usada por dois registros', async () => {
    const img = await novaImagem();
    const p1 = await app.inject({ method: 'POST', url: '/api/produtos', payload: { nome: 'Relé', imagemId: img.id } });
    expect(p1.statusCode).toBe(201);
    expect(p1.json().imagemId).toBe(img.id);
    const p2 = await app.inject({ method: 'POST', url: '/api/produtos', payload: { nome: 'Outro', imagemId: img.id } });
    expect(p2.statusCode).toBe(400);
    const proc = await app.inject({ method: 'POST', url: '/api/procedimentos', payload: { modeloVeiculo: 'X', defeitoReclamado: 'Y', imagens: [{ id: img.id }] } });
    expect(proc.statusCode).toBe(400);
    // o próprio produto pode reenviar a mesma foto ao editar
    const mesmo = await app.inject({ method: 'PUT', url: `/api/produtos/${p1.json().id}`, payload: { imagemId: img.id, nome: 'Relé 12V' } });
    expect(mesmo.statusCode).toBe(200);
  });

  it('limpeza apaga fotos sem dono há mais de 24 h e mantém as em uso', async () => {
    const emUso = await novaImagem();
    const abandonada = await novaImagem();
    const recente = await novaImagem();
    await prisma.produto.create({ data: { nome: 'Bateria', imagemId: emUso.id } });
    const ontem = new Date(Date.now() - 25 * 60 * 60 * 1000);
    await prisma.imagem.updateMany({ where: { id: { in: [emUso.id, abandonada.id] } }, data: { criadaEm: ontem } });

    expect(await limparImagensOrfas()).toBe(1);
    expect(await prisma.imagem.findUnique({ where: { id: abandonada.id } })).toBeNull();
    expect(existsSync(caminhoImagem(`${abandonada.id}.jpg`))).toBe(false);
    expect(await prisma.imagem.findUnique({ where: { id: emUso.id } })).not.toBeNull();
    expect(await prisma.imagem.findUnique({ where: { id: recente.id } })).not.toBeNull();
  });

  it('limpeza apaga arquivo que ficou sem registro (procedimento excluído)', async () => {
    const img = await novaImagem();
    const p = await prisma.procedimento.create({ data: { modeloVeiculo: 'Uno', defeitoReclamado: 'Pisca', imagens: { connect: { id: img.id } } } });
    await app.inject({ method: 'DELETE', url: `/api/procedimentos/${p.id}` });
    const arquivo = caminhoImagem(`${img.id}.jpg`);
    expect(existsSync(arquivo)).toBe(true);
    const antigo = (Date.now() - 25 * 60 * 60 * 1000) / 1000;
    utimesSync(arquivo, antigo, antigo);
    await limparImagensOrfas();
    expect(existsSync(arquivo)).toBe(false);
  });

  it('backup copia só as fotos novas', async () => {
    const destino = mkdtempSync(join(tmpdir(), 'alx-img-'));
    await novaImagem();
    await novaImagem();
    const total = readdirSync(pastaImagens()).length;
    expect(copiarImagensNovas(destino)).toBe(total);
    await novaImagem();
    expect(copiarImagensNovas(destino)).toBe(1);
    expect(readdirSync(destino)).toHaveLength(total + 1);
    rmSync(destino, { recursive: true, force: true });
  });

  it('fotos exigem login', async () => {
    const protegido = await buildApp();
    expect((await protegido.inject({ method: 'POST', url: '/api/imagens', payload: JPEG, headers: { 'content-type': 'image/jpeg' } })).statusCode).toBe(401);
    expect((await protegido.inject({ method: 'GET', url: `/api/imagens/${'a'.repeat(32)}` })).statusCode).toBe(401);
    await protegido.close();
  });
});

describe('ferramentas', () => {
  it('cadastra com foto e calcula o investimento sem contar descartadas', async () => {
    const img = await novaImagem();
    const post = (payload: object) => app.inject({ method: 'POST', url: '/api/ferramentas', payload });
    const scanner = await post({ nome: 'Scanner', categoria: 'Diagnóstico', valorCompraCentavos: 189000, dataCompra: '2026-03-10', imagemId: img.id });
    expect(scanner.statusCode).toBe(201);
    expect(new Date(scanner.json().dataCompra).getDate()).toBe(10);
    await post({ nome: 'Multímetro', categoria: 'Medição', valorCompraCentavos: 18900, quantidade: 2 });
    await post({ nome: 'Alicate velho', categoria: 'Medição', valorCompraCentavos: 5000, estado: 'DESCARTADA' });
    await post({ nome: 'Ferro de solda', valorCompraCentavos: 9500, estado: 'MANUTENCAO', garantiaAte: '2099-01-01' });

    const r = (await app.inject({ method: 'GET', url: '/api/ferramentas/resumo' })).json();
    expect(r).toMatchObject({ totalCentavos: 189000 + 2 * 18900 + 9500, cadastradas: 3, unidades: 4, emManutencao: 1, emGarantia: 1 });
    expect(r.porCategoria[0]).toEqual({ categoria: 'Diagnóstico', itens: 1, totalCentavos: 189000 });

    expect((await app.inject({ method: 'GET', url: '/api/ferramentas' })).json().total).toBe(3);
    expect((await app.inject({ method: 'GET', url: '/api/ferramentas?incluirDescartadas=true' })).json().total).toBe(4);
    expect((await app.inject({ method: 'GET', url: '/api/ferramentas?busca=scan' })).json().total).toBe(1);
    expect((await post({ nome: 'X', quantidade: 0 })).statusCode).toBe(400);
  });
});
