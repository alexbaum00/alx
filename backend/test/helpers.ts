import { prisma } from '../src/lib/prisma.js';

// Apaga todos os dados respeitando a ordem das chaves estrangeiras.
export async function limparBanco() {
  await prisma.$transaction([
    prisma.movimentacaoEstoque.deleteMany(),
    prisma.itemOrcamento.deleteMany(),
    prisma.orcamento.deleteMany(),
    prisma.itemVenda.deleteMany(),
    prisma.venda.deleteMany(),
    prisma.procedimento.deleteMany(),
    prisma.veiculo.deleteMany(),
    prisma.cliente.deleteMany(),
    prisma.produto.deleteMany(),
    prisma.ferramenta.deleteMany(),
    prisma.fornecedor.deleteMany(),
    prisma.servico.deleteMany(),
    prisma.despesa.deleteMany(),
    prisma.radio.deleteMany(),
    prisma.imagem.deleteMany(),
    prisma.sessao.deleteMany(),
    prisma.acesso.deleteMany(),
  ]);
}
