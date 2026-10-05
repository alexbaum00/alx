import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { limparBanco } from './helpers.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

beforeEach(limparBanco);

describe('health', () => {
  it('responde ok com o banco acessível', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ok');
  });
});

describe('clientes', () => {
  it('cria, normaliza documento e UF, e busca por nome', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/clientes',
      payload: { nome: 'João Silva', cpfCnpj: '123.456.789-01', uf: 'sp', email: '' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ cpfCnpj: '12345678901', uf: 'SP', email: null });

    const lista = await app.inject({ method: 'GET', url: '/api/clientes?busca=João' });
    expect(lista.json().total).toBe(1);
  });

  it('rejeita dados inválidos com mensagens por campo', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/clientes', payload: { nome: '', cpfCnpj: '123' } });
    expect(res.statusCode).toBe(400);
    const campos = res.json().campos.map((c: { campo: string }) => c.campo);
    expect(campos).toEqual(expect.arrayContaining(['nome', 'cpfCnpj']));
  });

  it('retorna 409 para CPF duplicado', async () => {
    const payload = { nome: 'A', cpfCnpj: '12345678901' };
    await app.inject({ method: 'POST', url: '/api/clientes', payload });
    const res = await app.inject({ method: 'POST', url: '/api/clientes', payload: { ...payload, nome: 'B' } });
    expect(res.statusCode).toBe(409);
  });

  it('atualiza e impede excluir cliente com veículo', async () => {
    const cliente = await prisma.cliente.create({
      data: { nome: 'Maria', veiculos: { create: { placa: 'ABC1D23', modelo: 'Ka' } } },
    });
    const upd = await app.inject({ method: 'PUT', url: `/api/clientes/${cliente.id}`, payload: { telefone: '11999990000' } });
    expect(upd.json().telefone).toBe('11999990000');

    const del = await app.inject({ method: 'DELETE', url: `/api/clientes/${cliente.id}` });
    expect(del.statusCode).toBe(409);
  });

  it('retorna 404 para cliente inexistente', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/clientes/9999' });
    expect(res.statusCode).toBe(404);
  });
});
