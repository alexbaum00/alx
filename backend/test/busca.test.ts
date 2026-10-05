import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { normalizarBusca } from '../src/lib/busca.js';
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

const total = async (url: string) => (await app.inject({ method: 'GET', url })).json().total as number;

describe('busca sem acento', () => {
  it('a regra do código bate com a dos gatilhos do banco', async () => {
    const nome = 'ÁÉÍÓÚ àèìòù ÂÊÎÔÛ ÃÕ ÄËÏÖÜ Çç Ññ Relé LÂMPADA';
    const { id } = await prisma.produto.create({ data: { nome } });
    // relê do banco: o create devolve a linha antes do gatilho preencher "busca"
    const p = await prisma.produto.findUniqueOrThrow({ where: { id } });
    expect(p.busca.trim()).toBe(normalizarBusca(nome));
  });

  it('acha com ou sem acento, em maiúsculas ou minúsculas, em todos os cadastros', async () => {
    await prisma.produto.createMany({ data: [{ nome: 'Relé 12V', categoria: 'Relés' }, { nome: 'Lâmpada H7', categoria: 'Lâmpadas' }] });
    await prisma.servico.create({ data: { nome: 'Aplicação de película profissional', categoria: 'PELICULA' } });
    await prisma.ferramenta.create({ data: { nome: 'Multímetro digital', localizacao: 'Gaveta Elétrica' } });
    await prisma.fornecedor.create({ data: { razaoSocial: 'Distribuidora São João', produtosFornecidos: 'Fusíveis e relés' } });
    await prisma.procedimento.create({ data: { modeloVeiculo: 'Fiat Uno', defeitoReclamado: 'Não dá partida', solucaoAplicada: 'Troca do relé da bomba' } });
    await prisma.despesa.create({ data: { descricao: 'Energia elétrica', valorCentavos: 100 } });
    const cliente = await prisma.cliente.create({ data: { nome: 'João Conceição', veiculos: { create: { placa: 'ABC1D23', modelo: 'Gol', marca: 'Volkswagen' } } } });

    for (const termo of ['rele', 'RELÉ', 'Rele 12v']) expect(await total(`/api/produtos?busca=${encodeURIComponent(termo)}`)).toBe(1);
    expect(await total('/api/produtos?busca=lampada')).toBe(1);
    expect(await total('/api/servicos?busca=PELICULA')).toBe(1);
    expect(await total('/api/ferramentas?busca=multimetro')).toBe(1);
    expect(await total('/api/ferramentas?busca=eletrica')).toBe(1); // pelo local
    expect(await total('/api/fornecedores?busca=sao joao')).toBe(1);
    expect(await total('/api/fornecedores?busca=fusiveis')).toBe(1);
    expect(await total('/api/procedimentos?busca=uno%20rele')).toBe(1);
    expect(await total('/api/procedimentos?busca=nao%20da%20partida')).toBe(1);
    expect(await total('/api/despesas?busca=eletrica')).toBe(1);
    expect(await total('/api/clientes?busca=joao%20conceicao')).toBe(1);
    expect(await total('/api/veiculos?busca=conceicao')).toBe(1); // pelo dono
    expect(await total('/api/veiculos?busca=volks')).toBe(1);

    // venda: pelo item e pelo cliente
    const servico = await prisma.servico.findFirstOrThrow();
    await app.inject({ method: 'POST', url: '/api/vendas', payload: { clienteId: cliente.id, itens: [{ tipo: 'SERVICO', servicoId: servico.id }] } });
    expect(await total('/api/vendas?busca=pelicula')).toBe(1);
    expect(await total('/api/vendas?busca=joao')).toBe(1);

    // orçamento: pelo contato sem cadastro
    await app.inject({ method: 'POST', url: '/api/orcamentos', payload: { nomeContato: 'Márcio Araújo', descricaoVeiculo: 'Fiorino', itens: [{ tipo: 'SERVICO', servicoId: servico.id }] } });
    expect(await total('/api/orcamentos?busca=marcio%20araujo')).toBe(1);
  });

  it('acompanha edições, inclusive parciais', async () => {
    const p = await prisma.produto.create({ data: { nome: 'Fusível 10A' } });
    await app.inject({ method: 'PUT', url: `/api/produtos/${p.id}`, payload: { nome: 'Relé auxiliar' } });
    expect(await total('/api/produtos?busca=fusivel')).toBe(0);
    expect(await total('/api/produtos?busca=rele auxiliar')).toBe(1);
    // mudar só outro campo não estraga a busca
    await app.inject({ method: 'PUT', url: `/api/produtos/${p.id}`, payload: { precoVendaCentavos: 999 } });
    expect(await total('/api/produtos?busca=rele')).toBe(1);
  });

  it('gatilhos de busca existem (migração futura que recriar tabela precisa recriá-los)', async () => {
    const tabelas = ['Cliente', 'Veiculo', 'Fornecedor', 'Produto', 'Servico', 'Procedimento', 'Ferramenta', 'Despesa', 'Orcamento', 'ItemVenda'];
    const gatilhos = await prisma.$queryRaw<{ name: string }[]>`SELECT name FROM sqlite_master WHERE type = 'trigger'`;
    const nomes = new Set(gatilhos.map((g) => g.name));
    for (const t of tabelas) {
      expect(nomes, `faltando gatilho de ${t}`).toContain(`${t}_busca_insert`);
      expect(nomes, `faltando gatilho de ${t}`).toContain(`${t}_busca_update`);
    }
  });
});
