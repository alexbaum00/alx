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

const post = (url: string, payload: object) => app.inject({ method: 'POST', url, payload });
const get = (url: string) => app.inject({ method: 'GET', url }).then((r) => r.json());

describe('datas no fuso local', () => {
  it('"2026-10-01" é 1º de outubro em São Paulo, não 30 de setembro', async () => {
    const despesa = (await post('/api/despesas', { descricao: 'DAS', valorCentavos: 7600, data: '2026-10-01' })).json();
    const d = new Date(despesa.data);
    expect([d.getDate(), d.getMonth() + 1]).toEqual([1, 10]);
    // filtro "até 01/10" inclui o dia inteiro
    expect((await get('/api/despesas?de=2026-10-01&ate=2026-10-01')).total).toBe(1);
    expect((await get('/api/despesas?ate=2026-09-30')).total).toBe(0);
  });
});

describe('relatórios', () => {
  it('financeiro separa pagas, a receber, despesas e saldo por forma de pagamento', async () => {
    const servico = await prisma.servico.create({ data: { nome: 'Revisão', precoCentavos: 10000 } });
    const item = [{ tipo: 'SERVICO', servicoId: servico.id }];
    await post('/api/vendas', { status: 'PAGO', formaPagamento: 'PIX', data: '2026-10-02', itens: item });
    await post('/api/vendas', { status: 'PAGO', formaPagamento: 'PIX', data: '2026-10-03', itens: item });
    await post('/api/vendas', { status: 'PAGO', formaPagamento: 'DINHEIRO', data: '2026-10-03', itens: item });
    await post('/api/vendas', { status: 'CONCLUIDO', data: '2026-10-04', itens: item });
    await post('/api/vendas', { status: 'PAGO', formaPagamento: 'PIX', data: '2026-09-15', itens: item }); // fora do período
    await post('/api/despesas', { descricao: 'Energia', valorCentavos: 4000, data: '2026-10-05' });
    await post('/api/despesas', { descricao: 'Aluguel', valorCentavos: 90000, data: '2026-10-10', pago: false });

    const r = await get('/api/relatorios/financeiro?de=2026-10-01&ate=2026-10-31');
    expect(r).toMatchObject({
      entradasCentavos: 30000,
      vendasPagas: 3,
      aReceberCentavos: 10000,
      despesasPagasCentavos: 4000,
      despesasPendentesCentavos: 90000,
      saldoCentavos: 26000,
    });
    expect(r.porFormaPagamento[0]).toEqual({ formaPagamento: 'PIX', totalCentavos: 20000, quantidade: 2 });
  });

  it('vendas: totais, ticket médio, por dia e ranking, sem canceladas', async () => {
    const lampada = await prisma.produto.create({ data: { nome: 'Lâmpada H7', precoVendaCentavos: 2500, estoqueAtual: 50 } });
    const venda = (p: object) => post('/api/vendas', { status: 'PAGO', formaPagamento: 'PIX', ...p });
    await venda({ data: '2026-10-02', itens: [{ tipo: 'PRODUTO', produtoId: lampada.id, quantidade: 2 }] });
    await venda({ data: '2026-10-02', itens: [{ tipo: 'SERVICO', descricao: 'Instalação', valorUnitarioCentavos: 3000 }] });
    const cancelada = (await venda({ data: '2026-10-03', itens: [{ tipo: 'PRODUTO', produtoId: lampada.id, quantidade: 10 }] })).json();
    await app.inject({ method: 'PATCH', url: `/api/vendas/${cancelada.id}/status`, payload: { status: 'CANCELADO' } });

    const r = await get('/api/relatorios/vendas?de=2026-10-01&ate=2026-10-31');
    expect(r).toMatchObject({ totalCentavos: 8000, vendas: 2, ticketMedioCentavos: 4000, produtosCentavos: 5000, servicosCentavos: 3000 });
    expect(r.porDia).toEqual([{ dia: '2026-10-02', totalCentavos: 8000, vendas: 2 }]);
    expect(r.topProdutos).toEqual([{ descricao: 'Lâmpada H7', quantidade: 2, totalCentavos: 5000 }]);
    expect(r.topServicos[0].descricao).toBe('Instalação');
  });

  it('link do emissor de NF-e precisa ser um endereço web', async () => {
    const ruim = await app.inject({ method: 'PUT', url: '/api/empresa', payload: { urlEmissorNfe: 'sefaz' } });
    expect(ruim.statusCode).toBe(400);
    const bom = await app.inject({ method: 'PUT', url: '/api/empresa', payload: { urlEmissorNfe: 'https://www.sefaz.exemplo.gov.br/nff' } });
    expect(bom.json().urlEmissorNfe).toBe('https://www.sefaz.exemplo.gov.br/nff');
  });
});
