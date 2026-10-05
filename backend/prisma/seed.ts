// Dados de exemplo para desenvolvimento (os mesmos que aparecem no layout de referência).
import type { Prisma } from '@prisma/client';
// carrega backend/.env (e o padrão de DATABASE_URL) antes de abrir o banco
import { prisma } from '../src/lib/prisma.js';

async function main() {
  const jaTem = await prisma.cliente.count();
  if (jaTem > 0) {
    console.log('Banco já possui dados; seed ignorado.');
    return;
  }

  await prisma.empresa.upsert({ where: { id: 1 }, update: {}, create: { nomeFantasia: 'ALX Auto Elétrica' } });

  const fornecedor = await prisma.fornecedor.create({
    data: { razaoSocial: 'Distribuidora Elétrica Exemplo Ltda', nomeFantasia: 'DistriAuto', produtosFornecidos: 'Lâmpadas, relés, fusíveis, cabos' },
  });

  const produtos = await Promise.all(
    [
      { nome: 'Lâmpada H7', categoria: 'Lâmpadas', precoCustoCentavos: 1200, precoVendaCentavos: 2500, estoqueAtual: 24, estoqueMinimo: 10 },
      { nome: 'Fusível 10A', categoria: 'Fusíveis', precoCustoCentavos: 50, precoVendaCentavos: 200, estoqueAtual: 50, estoqueMinimo: 20 },
      { nome: 'Relé 12V', categoria: 'Relés', precoCustoCentavos: 900, precoVendaCentavos: 2500, estoqueAtual: 8, estoqueMinimo: 10 },
      { nome: 'Bateria 60Ah', categoria: 'Baterias', precoCustoCentavos: 32000, precoVendaCentavos: 45000, estoqueAtual: 4, estoqueMinimo: 5 },
      { nome: 'Cabo 2,5mm', categoria: 'Cabos', unidade: 'm', precoCustoCentavos: 150, precoVendaCentavos: 400, estoqueAtual: 100, estoqueMinimo: 30 },
    ].map((p) => prisma.produto.create({ data: { ...p, fornecedorId: fornecedor.id } })),
  );

  await prisma.servico.createMany({
    data: [
      { nome: 'Revisão elétrica', precoCentavos: 15000, tempoEstimadoMin: 60 },
      { nome: 'Troca de bateria', precoCentavos: 3000, tempoEstimadoMin: 20 },
      { nome: 'Instalação de som', precoCentavos: 20000, tempoEstimadoMin: 120 },
      { nome: 'Reparo de alternador', precoCentavos: 18000, tempoEstimadoMin: 90 },
      { nome: 'Diagnóstico com scanner', precoCentavos: 10000, tempoEstimadoMin: 30 },
    ],
  });

  const pessoas: Array<[string, string, string, string]> = [
    ['João Silva', 'QWE1234', 'VW', 'Polo'],
    ['Maria Souza', 'ABC5678', 'Ford', 'Ka'],
    ['Carlos Pereira', 'XYZ9876', 'GM', 'Onix'],
    ['André Lima', 'DEF4321', 'Fiat', 'Uno'],
    ['Fernanda Alves', 'GHI7654', 'Toyota', 'Corolla'],
  ];

  for (const [i, [nome, placa, marca, modelo]] of pessoas.entries()) {
    const cliente = await prisma.cliente.create({
      data: { nome, telefone: `(11) 9${8000 + i}-000${i}`, veiculos: { create: { placa, marca, modelo } } },
      include: { veiculos: true },
    });
    const servico = (await prisma.servico.findMany())[i];
    const produto = produtos[i];
    const itens: Prisma.ItemVendaCreateWithoutVendaInput[] = [
      { tipo: 'SERVICO', descricao: servico.nome, servico: { connect: { id: servico.id } }, quantidade: 1, valorUnitarioCentavos: servico.precoCentavos, valorTotalCentavos: servico.precoCentavos },
      { tipo: 'PRODUTO', descricao: produto.nome, produto: { connect: { id: produto.id } }, quantidade: 1, valorUnitarioCentavos: produto.precoVendaCentavos, valorTotalCentavos: produto.precoVendaCentavos },
    ];
    await prisma.venda.create({
      data: {
        clienteId: cliente.id,
        veiculoId: cliente.veiculos[0].id,
        status: 'PAGO',
        formaPagamento: 'PIX',
        totalServicosCentavos: servico.precoCentavos,
        totalProdutosCentavos: produto.precoVendaCentavos,
        valorTotalCentavos: servico.precoCentavos + produto.precoVendaCentavos,
        itens: { create: itens },
      },
    });
  }

  // Orçamento avulso para alguém que ainda não é cliente
  const bateria = produtos[3];
  const troca = await prisma.servico.findFirstOrThrow({ where: { nome: 'Troca de bateria' } });
  await prisma.orcamento.create({
    data: {
      nomeContato: 'Ricardo Gomes',
      telefoneContato: '(11) 97777-1234',
      descricaoVeiculo: 'Honda Civic 2015',
      validadeAte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      totalProdutosCentavos: bateria.precoVendaCentavos,
      totalServicosCentavos: troca.precoCentavos,
      valorTotalCentavos: bateria.precoVendaCentavos + troca.precoCentavos,
      itens: {
        create: [
          { tipo: 'PRODUTO', produtoId: bateria.id, descricao: bateria.nome, quantidade: 1, valorUnitarioCentavos: bateria.precoVendaCentavos, valorTotalCentavos: bateria.precoVendaCentavos },
          { tipo: 'SERVICO', servicoId: troca.id, descricao: troca.nome, quantidade: 1, valorUnitarioCentavos: troca.precoCentavos, valorTotalCentavos: troca.precoCentavos },
        ],
      },
    },
  });

  await prisma.procedimento.create({
    data: {
      modeloVeiculo: 'VW Polo 1.6 2018',
      defeitoReclamado: 'Bateria descarregando com o carro parado',
      diagnosticoEncontrado: 'Consumo parasita de 380 mA; módulo do rádio não entrava em repouso',
      solucaoAplicada: 'Atualização/troca do rádio; consumo caiu para 25 mA',
      esquemaEletricoAnotacoes: 'Medir consumo após 10 min de travamento. Fusível SC24 alimenta o rádio.',
      tags: 'consumo parasita, bateria, rádio',
    },
  });

  console.log('Seed concluído.');
}

main().finally(() => prisma.$disconnect());
