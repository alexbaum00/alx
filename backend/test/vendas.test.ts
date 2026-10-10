import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { limparBanco } from './helpers.js';

let app: FastifyInstance;
let rele: { id: number };
let cabo: { id: number };
let revisao: { id: number };
let cliente: { id: number; veiculos: { id: number }[] };

beforeAll(async () => {
  app = await buildApp({ autenticacao: false });
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await limparBanco();
  rele = await prisma.produto.create({ data: { nome: 'Relé 12V', precoVendaCentavos: 2500, estoqueAtual: 10, estoqueMinimo: 3 } });
  cabo = await prisma.produto.create({ data: { nome: 'Cabo 2,5mm', unidade: 'm', precoVendaCentavos: 400, estoqueAtual: 100 } });
  revisao = await prisma.servico.create({ data: { nome: 'Revisão elétrica', precoCentavos: 15000 } });
  cliente = await prisma.cliente.create({
    data: { nome: 'João', veiculos: { create: { placa: 'QWE1234', modelo: 'Polo' } } },
    include: { veiculos: true },
  });
});

const estoque = async (id: number) => (await prisma.produto.findUniqueOrThrow({ where: { id } })).estoqueAtual;
const post = (url: string, payload: object) => app.inject({ method: 'POST', url, payload });
const patch = (url: string, payload: object) => app.inject({ method: 'PATCH', url, payload });

describe('vendas', () => {
  it('venda de balcão já paga calcula totais e baixa o estoque na hora, sem orçamento', async () => {
    const res = await post('/api/vendas', {
      status: 'PAGO',
      formaPagamento: 'PIX',
      descontoCentavos: 1000,
      itens: [
        { tipo: 'PRODUTO', produtoId: rele.id, quantidade: 2 },
        { tipo: 'PRODUTO', produtoId: cabo.id, quantidade: 2.5 },
        { tipo: 'SERVICO', descricao: 'Instalação', valorUnitarioCentavos: 5000 },
      ],
    });
    expect(res.statusCode).toBe(201);
    const venda = res.json();
    expect(venda).toMatchObject({
      totalProdutosCentavos: 6000, // 2 x 25,00 + 2,5 m x 4,00
      totalServicosCentavos: 5000,
      valorTotalCentavos: 10000,
      estoqueBaixado: true,
      orcamento: null,
    });
    expect(await estoque(rele.id)).toBe(8);
    expect(await estoque(cabo.id)).toBe(97.5);
  });

  it('OS aberta não baixa estoque; concluir baixa e cancelar devolve', async () => {
    const venda = (
      await post('/api/vendas', {
        clienteId: cliente.id,
        veiculoId: cliente.veiculos[0].id,
        kmEntrada: 54000,
        itens: [{ tipo: 'PRODUTO', produtoId: rele.id, quantidade: 3 }, { tipo: 'SERVICO', servicoId: revisao.id }],
      })
    ).json();
    expect(venda.status).toBe('ABERTO');
    expect(await estoque(rele.id)).toBe(10);
    expect((await prisma.veiculo.findUniqueOrThrow({ where: { id: cliente.veiculos[0].id } })).kmAtual).toBe(54000);

    await patch(`/api/vendas/${venda.id}/status`, { status: 'CONCLUIDO' });
    expect(await estoque(rele.id)).toBe(7);

    // pagar depois de concluir não baixa de novo
    await patch(`/api/vendas/${venda.id}/status`, { status: 'PAGO', formaPagamento: 'DINHEIRO' });
    expect(await estoque(rele.id)).toBe(7);

    await patch(`/api/vendas/${venda.id}/status`, { status: 'CANCELADO' });
    expect(await estoque(rele.id)).toBe(10);

    const movs = await prisma.movimentacaoEstoque.findMany({ where: { produtoId: rele.id }, orderBy: { id: 'asc' } });
    expect(movs.map((m) => [m.tipo, m.quantidade])).toEqual([['SAIDA', -3], ['ENTRADA', 3]]);

    const reabrir = await patch(`/api/vendas/${venda.id}/status`, { status: 'ABERTO' });
    expect(reabrir.statusCode).toBe(400);
  });

  it('bloqueia conclusão sem estoque suficiente, sem alterar nada', async () => {
    const res = await post('/api/vendas', {
      status: 'PAGO',
      formaPagamento: 'PIX',
      itens: [{ tipo: 'PRODUTO', produtoId: rele.id, quantidade: 11 }],
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().erro).toContain('Relé 12V');
    expect(await estoque(rele.id)).toBe(10);
    expect(await prisma.venda.count()).toBe(0);
  });

  it('exige forma de pagamento para marcar como paga', async () => {
    const res = await post('/api/vendas', { status: 'PAGO', itens: [{ tipo: 'SERVICO', servicoId: revisao.id }] });
    expect(res.statusCode).toBe(400);
  });

  it('editar itens de venda concluída reajusta o estoque', async () => {
    const venda = (
      await post('/api/vendas', { status: 'CONCLUIDO', itens: [{ tipo: 'PRODUTO', produtoId: rele.id, quantidade: 2 }] })
    ).json();
    expect(await estoque(rele.id)).toBe(8);

    const res = await app.inject({
      method: 'PUT',
      url: `/api/vendas/${venda.id}`,
      payload: { itens: [{ tipo: 'PRODUTO', produtoId: rele.id, quantidade: 5 }] },
    });
    expect(res.json().valorTotalCentavos).toBe(12500);
    expect(await estoque(rele.id)).toBe(5);
  });

  it('PUT só com observação mantém o desconto', async () => {
    const venda = (
      await post('/api/vendas', { descontoCentavos: 500, itens: [{ tipo: 'SERVICO', servicoId: revisao.id }] })
    ).json();
    const res = await app.inject({ method: 'PUT', url: `/api/vendas/${venda.id}`, payload: { observacoes: 'Cliente volta amanhã' } });
    expect(res.json()).toMatchObject({ descontoCentavos: 500, valorTotalCentavos: 14500 });
  });

  it('recusa veículo de outro cliente', async () => {
    const outro = await prisma.cliente.create({ data: { nome: 'Maria' } });
    const res = await post('/api/vendas', {
      clienteId: outro.id,
      veiculoId: cliente.veiculos[0].id,
      itens: [{ tipo: 'SERVICO', servicoId: revisao.id }],
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('Pix da venda', () => {
  it('pede a chave antes e depois gera o QR com o valor da venda', async () => {
    await prisma.empresa.deleteMany();
    const venda = (await post('/api/vendas', { itens: [{ tipo: 'SERVICO', descricao: 'Instalação', valorUnitarioCentavos: 15050 }] })).json();
    const semChave = await app.inject({ method: 'GET', url: `/api/vendas/${venda.id}/pix` });
    expect(semChave.statusCode).toBe(400);

    const ruim = await app.inject({ method: 'PUT', url: '/api/empresa', payload: { pixChave: 'qualquer coisa' } });
    expect(ruim.statusCode).toBe(400);
    const ok = await app.inject({ method: 'PUT', url: '/api/empresa', payload: { pixChave: '+55 (11) 99999-8888', pixNome: 'Alex', pixCidade: 'São Paulo' } });
    expect(ok.json().pixChave).toBe('+5511999998888');

    const pix = (await app.inject({ method: 'GET', url: `/api/vendas/${venda.id}/pix` })).json();
    expect(pix.payload).toContain('0114+5511999998888');
    expect(pix.payload).toContain('5406150.50');
    expect(pix.payload).toContain(`VENDA${venda.id}`);
    expect(pix.qrSvg).toContain('<svg');

    // Nova Venda: QR pelo valor, antes de a venda ser salva
    const avulso = (await app.inject({ method: 'GET', url: '/api/sistema/pix?valorCentavos=17000' })).json();
    expect(avulso.payload).toContain('5406170.00');
    expect((await app.inject({ method: 'GET', url: '/api/sistema/pix?valorCentavos=0' })).statusCode).toBe(400);
    await prisma.empresa.deleteMany();
  });
});

describe('orçamentos (módulo separado)', () => {
  it('pode ser feito para contato sem cadastro, não mexe no estoque e não conta como venda', async () => {
    const res = await post('/api/orcamentos', {
      nomeContato: 'Pedro',
      telefoneContato: '11999990000',
      descricaoVeiculo: 'Gol 2012',
      itens: [{ tipo: 'PRODUTO', produtoId: rele.id, quantidade: 2 }],
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ status: 'PENDENTE', valorTotalCentavos: 5000 });
    expect(await estoque(rele.id)).toBe(10);
    expect(await prisma.venda.count()).toBe(0);
  });

  it('converte em venda mantendo os preços orçados, uma única vez', async () => {
    const orc = (
      await post('/api/orcamentos', {
        clienteId: cliente.id,
        itens: [{ tipo: 'PRODUTO', produtoId: rele.id, quantidade: 1 }, { tipo: 'SERVICO', servicoId: revisao.id }],
      })
    ).json();

    // preço sobe depois do orçamento: a venda respeita o valor combinado
    await prisma.produto.update({ where: { id: rele.id }, data: { precoVendaCentavos: 9900 } });

    const venda = await post(`/api/orcamentos/${orc.id}/converter`, { status: 'PAGO', formaPagamento: 'PIX' });
    expect(venda.statusCode).toBe(201);
    expect(venda.json()).toMatchObject({ valorTotalCentavos: 17500, status: 'PAGO', orcamento: { id: orc.id } });
    expect(await estoque(rele.id)).toBe(9);

    const depois = (await app.inject({ method: 'GET', url: `/api/orcamentos/${orc.id}` })).json();
    expect(depois).toMatchObject({ status: 'CONVERTIDO', venda: { id: venda.json().id } });

    expect((await post(`/api/orcamentos/${orc.id}/converter`, {})).statusCode).toBe(409);
    expect((await app.inject({ method: 'DELETE', url: `/api/orcamentos/${orc.id}` })).statusCode).toBe(409);
  });

  it('exige cliente ou nome do contato', async () => {
    const res = await post('/api/orcamentos', { itens: [{ tipo: 'SERVICO', servicoId: revisao.id }] });
    expect(res.statusCode).toBe(400);
  });
});

describe('dashboard', () => {
  it('soma o dia ignorando canceladas e lista estoque baixo primeiro', async () => {
    await post('/api/vendas', {
      clienteId: cliente.id,
      veiculoId: cliente.veiculos[0].id,
      status: 'PAGO',
      formaPagamento: 'PIX',
      itens: [{ tipo: 'PRODUTO', produtoId: rele.id, quantidade: 7 }, { tipo: 'SERVICO', servicoId: revisao.id }],
    });
    const cancelada = (
      await post('/api/vendas', { status: 'PAGO', formaPagamento: 'PIX', itens: [{ tipo: 'SERVICO', servicoId: revisao.id }] })
    ).json();
    await patch(`/api/vendas/${cancelada.id}/status`, { status: 'CANCELADO' });

    const stats = (await app.inject({ method: 'GET', url: '/api/dashboard/stats' })).json();
    expect(stats.vendasHoje).toEqual({ totalCentavos: 32500, atendimentos: 1 });
    expect(stats.produtosVendidosHoje).toBe(7);
    expect(stats.servicosHoje).toBe(1);
    expect(stats.estoqueBaixo).toBe(1); // relé ficou com 3, mínimo 3
    expect(stats.produtosEstoque[0]).toMatchObject({ nome: 'Relé 12V', estoqueBaixo: true });
    expect(stats.vendasRecentes).toHaveLength(2);
    expect(stats.veiculosRecentes[0]).toMatchObject({ placa: 'QWE1234', modelo: 'Polo', servico: 'Revisão elétrica' });
  });
});
