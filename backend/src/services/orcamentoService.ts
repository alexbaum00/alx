import type { Prisma, StatusVenda, FormaPagamento } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError, NotFoundError } from '../lib/errors.js';
import { paginar } from '../lib/crud.js';
import { calcularItens } from './itensService.js';
import { validarClienteVeiculo } from './vinculosService.js';
import { criarNaTransacao as criarVenda, detalhar as detalharVenda } from './vendaService.js';
import type { OrcamentoCreate, OrcamentoList, OrcamentoUpdate } from '../schemas/vendas.js';

const incluirDetalhes = {
  cliente: true,
  veiculo: true,
  itens: { orderBy: { id: 'asc' } },
  venda: { select: { id: true, status: true } },
} satisfies Prisma.OrcamentoInclude;

export async function listar(q: OrcamentoList) {
  const where: Prisma.OrcamentoWhereInput = {
    status: q.status,
    ...(q.busca && {
      OR: [
        { cliente: { nome: { contains: q.busca } } },
        { nomeContato: { contains: q.busca } },
        { veiculo: { placa: { contains: q.busca.toUpperCase() } } },
        { descricaoVeiculo: { contains: q.busca } },
      ],
    }),
  };
  const [itens, total] = await prisma.$transaction([
    prisma.orcamento.findMany({
      where,
      orderBy: { data: 'desc' },
      include: {
        cliente: { select: { id: true, nome: true } },
        veiculo: { select: { id: true, placa: true, modelo: true } },
      },
      ...paginar(q.pagina, q.porPagina),
    }),
    prisma.orcamento.count({ where }),
  ]);
  return { itens, total, pagina: q.pagina, porPagina: q.porPagina };
}

export async function buscarPorId(id: number) {
  const orcamento = await prisma.orcamento.findUnique({ where: { id }, include: incluirDetalhes });
  if (!orcamento) throw new NotFoundError('Orçamento');
  return orcamento;
}

// Orçamento não mexe em estoque: só registra preços para o cliente decidir.
export function criar({ itens, descontoCentavos, ...data }: OrcamentoCreate) {
  if (!data.clienteId && !data.nomeContato) throw new AppError('Informe o cliente ou o nome do contato');
  return prisma.$transaction(async (tx) => {
    await validarClienteVeiculo(tx, data.clienteId, data.veiculoId);
    const calculo = await calcularItens(tx, itens, descontoCentavos);
    return tx.orcamento.create({
      data: { ...data, ...calculo.totais, itens: { create: calculo.itens } },
      include: incluirDetalhes,
    });
  });
}

export function atualizar(id: number, { itens, ...data }: OrcamentoUpdate) {
  return prisma.$transaction(async (tx) => {
    const atual = await tx.orcamento.findUnique({ where: { id } });
    if (!atual) throw new NotFoundError('Orçamento');
    if (atual.status === 'CONVERTIDO') throw new AppError('Orçamento já convertido em venda não pode ser alterado');

    await validarClienteVeiculo(
      tx,
      data.clienteId !== undefined ? data.clienteId : atual.clienteId,
      data.veiculoId !== undefined ? data.veiculoId : atual.veiculoId,
    );

    let totais = {};
    if (itens) {
      const calculo = await calcularItens(tx, itens, data.descontoCentavos ?? atual.descontoCentavos);
      await tx.itemOrcamento.deleteMany({ where: { orcamentoId: id } });
      await tx.itemOrcamento.createMany({ data: calculo.itens.map((i) => ({ ...i, orcamentoId: id })) });
      totais = calculo.totais;
    } else if (data.descontoCentavos !== undefined) {
      const subtotal = atual.totalProdutosCentavos + atual.totalServicosCentavos;
      if (data.descontoCentavos > subtotal) throw new AppError('Desconto maior que o valor dos itens');
      totais = { valorTotalCentavos: subtotal - data.descontoCentavos };
    }
    return tx.orcamento.update({ where: { id }, data: { ...data, ...totais }, include: incluirDetalhes });
  });
}

export async function alterarStatus(id: number, status: 'PENDENTE' | 'APROVADO' | 'RECUSADO') {
  const atual = await buscarPorId(id);
  if (atual.status === 'CONVERTIDO') throw new AppError('Orçamento já convertido em venda');
  return prisma.orcamento.update({ where: { id }, data: { status }, include: incluirDetalhes });
}

// Gera uma venda com os itens e preços do orçamento.
export function converterEmVenda(id: number, opcoes: { status: Exclude<StatusVenda, 'CANCELADO'>; formaPagamento?: FormaPagamento | null }) {
  return prisma.$transaction(async (tx) => {
    const orcamento = await tx.orcamento.findUnique({ where: { id }, include: { itens: true } });
    if (!orcamento) throw new NotFoundError('Orçamento');
    if (orcamento.status === 'CONVERTIDO') throw new AppError('Orçamento já foi convertido em venda', 409);
    if (orcamento.status === 'RECUSADO') throw new AppError('Orçamento recusado; reabra-o antes de converter');

    const semProduto = orcamento.itens.find((i) => i.tipo === 'PRODUTO' && i.produtoId == null);
    if (semProduto) throw new AppError(`O produto "${semProduto.descricao}" foi excluído do cadastro; edite o orçamento`);

    const venda = await criarVenda(tx, {
      clienteId: orcamento.clienteId,
      veiculoId: orcamento.veiculoId,
      status: opcoes.status,
      formaPagamento: opcoes.formaPagamento,
      descontoCentavos: orcamento.descontoCentavos,
      observacoes: orcamento.observacoes,
      itens: orcamento.itens.map((i) =>
        i.tipo === 'PRODUTO'
          ? { tipo: 'PRODUTO', produtoId: i.produtoId!, quantidade: i.quantidade, valorUnitarioCentavos: i.valorUnitarioCentavos, descricao: i.descricao }
          : { tipo: 'SERVICO', servicoId: i.servicoId ?? undefined, descricao: i.descricao, quantidade: i.quantidade, valorUnitarioCentavos: i.valorUnitarioCentavos },
      ),
    });
    await tx.orcamento.update({ where: { id }, data: { status: 'CONVERTIDO', vendaId: venda.id } });
    return detalharVenda(tx, venda.id);
  });
}

export async function remover(id: number) {
  const atual = await buscarPorId(id);
  if (atual.status === 'CONVERTIDO') throw new AppError('Orçamento convertido em venda não pode ser excluído', 409);
  await prisma.orcamento.delete({ where: { id } });
}
