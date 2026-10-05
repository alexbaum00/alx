import { z } from 'zod';
import { dataLocal, listQuery, parcial, textoOpcional } from './common.js';
import { centavos, itensInput } from './itens.js';

export const statusVenda = z.enum(['ABERTO', 'CONCLUIDO', 'PAGO', 'CANCELADO']);
export const formaPagamento = z.enum(['PIX', 'DINHEIRO', 'CARTAO_DEBITO', 'CARTAO_CREDITO', 'BOLETO', 'OUTRO']);
export const statusOrcamento = z.enum(['PENDENTE', 'APROVADO', 'RECUSADO']);

const idOpcional = z.number().int().positive().nullish();

export const vendaCreate = z.object({
  clienteId: idOpcional, // venda de balcão pode não ter cliente
  veiculoId: idOpcional,
  data: dataLocal.optional(),
  // venda de balcão já nasce PAGO; ordem de serviço começa ABERTO
  status: statusVenda.exclude(['CANCELADO']).default('ABERTO'),
  formaPagamento: formaPagamento.nullish(),
  kmEntrada: z.number().int().min(0).nullish(),
  descontoCentavos: centavos.default(0),
  observacoes: textoOpcional,
  itens: itensInput,
});
export const vendaUpdate = parcial(vendaCreate.omit({ status: true }));
export const vendaStatus = z.object({ status: statusVenda, formaPagamento: formaPagamento.nullish() });
export const vendaList = listQuery.extend({
  status: statusVenda.optional(),
  clienteId: z.coerce.number().int().positive().optional(),
  veiculoId: z.coerce.number().int().positive().optional(),
  de: dataLocal.optional(),
  ate: dataLocal.optional(),
});

export const orcamentoCreate = z.object({
  clienteId: idOpcional,
  veiculoId: idOpcional,
  nomeContato: textoOpcional,
  telefoneContato: textoOpcional,
  descricaoVeiculo: textoOpcional,
  validadeAte: dataLocal.nullish(),
  descontoCentavos: centavos.default(0),
  observacoes: textoOpcional,
  itens: itensInput,
});
export const orcamentoUpdate = parcial(orcamentoCreate);
export const orcamentoStatus = z.object({ status: statusOrcamento });
export const orcamentoConverter = z.object({
  status: statusVenda.exclude(['CANCELADO']).default('ABERTO'),
  formaPagamento: formaPagamento.nullish(),
});
export const orcamentoList = listQuery.extend({ status: z.enum(['PENDENTE', 'APROVADO', 'RECUSADO', 'CONVERTIDO']).optional() });

export type VendaCreate = z.infer<typeof vendaCreate>;
export type VendaUpdate = z.infer<typeof vendaUpdate>;
export type VendaList = z.infer<typeof vendaList>;
export type OrcamentoCreate = z.infer<typeof orcamentoCreate>;
export type OrcamentoUpdate = z.infer<typeof orcamentoUpdate>;
export type OrcamentoList = z.infer<typeof orcamentoList>;
