import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { limparBanco } from './helpers.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp({ autenticacao: false });
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

beforeEach(limparBanco);

const post = (url: string, payload: object) => app.inject({ method: 'POST', url, payload });
const get = (url: string) => app.inject({ method: 'GET', url });

describe('veículos', () => {
  it('normaliza placa antiga e Mercosul e recusa placa inválida', async () => {
    const cliente = await prisma.cliente.create({ data: { nome: 'Ana' } });
    expect((await post('/api/veiculos', { clienteId: cliente.id, placa: 'abc-1234', modelo: 'Ka' })).json().placa).toBe('ABC1234');
    expect((await post('/api/veiculos', { clienteId: cliente.id, placa: 'bra2e19', modelo: 'Onix' })).json().placa).toBe('BRA2E19');
    expect((await post('/api/veiculos', { clienteId: cliente.id, placa: '12345', modelo: 'X' })).statusCode).toBe(400);
    expect((await post('/api/veiculos', { clienteId: 999, placa: 'XYZ9876', modelo: 'Uno' })).statusCode).toBe(404);
    expect((await get('/api/veiculos?busca=abc-1234')).json().total).toBe(1);
  });
});

describe('produtos e estoque', () => {
  it('registra estoque inicial, entrada com custo, ajuste e filtra estoque baixo', async () => {
    const fornecedor = (await post('/api/fornecedores', { razaoSocial: 'Distribuidora X', cnpj: '12.345.678/0001-90' })).json();
    expect(fornecedor.cnpj).toBe('12345678000190');

    const produto = (
      await post('/api/produtos', { nome: 'Bateria 60Ah', fornecedorId: fornecedor.id, precoCustoCentavos: 30000, estoqueAtual: 2, estoqueMinimo: 3 })
    ).json();
    expect((await get('/api/produtos/estoque-baixo')).json()).toHaveLength(1);
    expect((await get('/api/produtos?estoqueBaixo=true')).json().total).toBe(1);

    const apos = (await post(`/api/produtos/${produto.id}/entrada`, { quantidade: 5, custoUnitarioCentavos: 32000 })).json();
    expect(apos).toMatchObject({ estoqueAtual: 7, precoCustoCentavos: 32000 });
    expect((await get('/api/produtos?estoqueBaixo=true')).json().total).toBe(0);

    await post(`/api/produtos/${produto.id}/ajuste`, { estoqueAtual: 6, motivo: 'Contagem' });
    const detalhe = (await get(`/api/produtos/${produto.id}`)).json();
    expect(detalhe.movimentacoes.map((m: { tipo: string; quantidade: number }) => [m.tipo, m.quantidade])).toEqual([
      ['AJUSTE', -1],
      ['ENTRADA', 5],
      ['ENTRADA', 2],
    ]);
  });

  it('PUT parcial altera só o que veio: não mexe em estoque nem zera preços', async () => {
    const produto = (
      await post('/api/produtos', { nome: 'Fusível', unidade: 'cx', precoVendaCentavos: 200, estoqueAtual: 10, ativo: false })
    ).json();
    const res = await app.inject({ method: 'PUT', url: `/api/produtos/${produto.id}`, payload: { estoqueAtual: 999, nome: 'Fusível 10A' } });
    expect(res.json()).toMatchObject({ nome: 'Fusível 10A', estoqueAtual: 10, precoVendaCentavos: 200, unidade: 'cx', ativo: false });
  });
});

describe('procedimentos', () => {
  it('busca por várias palavras em qualquer campo', async () => {
    await post('/api/procedimentos', {
      modeloVeiculo: 'VW Polo 2018',
      defeitoReclamado: 'Bateria descarregando',
      esquemaEletricoAnotacoes: 'Fusível SC24 alimenta o rádio',
    });
    await post('/api/procedimentos', { modeloVeiculo: 'Fiat Uno', defeitoReclamado: 'Farol não acende' });

    expect((await get('/api/procedimentos?busca=polo SC24')).json().total).toBe(1);
    expect((await get('/api/procedimentos?busca=uno bateria')).json().total).toBe(0);
  });
});

describe('despesas e empresa', () => {
  it('soma despesas do período e salva dados da oficina', async () => {
    await post('/api/despesas', { descricao: 'DAS MEI', valorCentavos: 7600, data: '2026-10-01' });
    await post('/api/despesas', { descricao: 'Energia', valorCentavos: 25000, data: '2026-10-03' });
    expect((await get('/api/despesas?de=2026-10-02')).json().totalCentavos).toBe(25000);

    const empresa = await app.inject({ method: 'PUT', url: '/api/empresa', payload: { cnpj: '12.345.678/0001-90', uf: 'sp' } });
    expect(empresa.json()).toMatchObject({ nomeFantasia: 'ALX Auto Elétrica', cnpj: '12345678000190', uf: 'SP' });
  });
});

describe('serviços por categoria', () => {
  it('guarda a categoria, usa OUTROS por padrão, recusa categoria fora da lista e filtra', async () => {
    const radio = await post('/api/servicos', { nome: 'Instalação Rádio MP3', categoria: 'SOM', precoCentavos: 6000 });
    expect(radio.statusCode).toBe(201);
    expect(radio.json().categoria).toBe('SOM');
    expect((await post('/api/servicos', { nome: 'Lavagem' })).json().categoria).toBe('OUTROS');
    expect((await post('/api/servicos', { nome: 'X', categoria: 'Pelicula' })).statusCode).toBe(400);
    await post('/api/servicos', { nome: 'Remoção de película', categoria: 'PELICULA' });

    expect((await get('/api/servicos?categoria=SOM')).json().total).toBe(1);
    expect((await get('/api/servicos?categoria=INVALIDA')).statusCode).toBe(400);

    // editar só o preço mantém a categoria
    const editado = await app.inject({ method: 'PUT', url: `/api/servicos/${radio.json().id}`, payload: { precoCentavos: 7000 } });
    expect(editado.json()).toMatchObject({ categoria: 'SOM', precoCentavos: 7000 });
  });
});
