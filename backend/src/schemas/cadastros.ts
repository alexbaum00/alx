import { z } from 'zod';
import { dataLocal, listQuery, parcial, somenteDigitos, textoOpcional } from './common.js';
import { centavos } from './itens.js';

const idOpcional = z.number().int().positive().nullish();
const imagemId = z.string().regex(/^[a-f0-9]{32}$/, 'Imagem inválida');

// Placa antiga (ABC1234) ou Mercosul (ABC1D23); aceita com hífen/minúsculas.
const placa = z
  .string()
  .transform((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, ''))
  .refine((v) => /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(v), 'Placa inválida');

export const veiculoCreate = z.object({
  clienteId: z.number().int().positive(),
  placa,
  marca: textoOpcional,
  modelo: z.string().trim().min(1, 'Modelo é obrigatório'),
  ano: z.number().int().min(1900).max(2100).nullish(),
  cor: textoOpcional,
  kmAtual: z.number().int().min(0).nullish(),
});
export const veiculoUpdate = parcial(veiculoCreate);
export const veiculoList = listQuery.extend({ clienteId: z.coerce.number().int().positive().optional() });

export const fornecedorCreate = z.object({
  razaoSocial: z.string().trim().min(1, 'Razão social é obrigatória'),
  nomeFantasia: textoOpcional,
  cnpj: textoOpcional.transform(somenteDigitos).refine((v) => v == null || v.length === 14, 'CNPJ deve ter 14 dígitos'),
  telefone: textoOpcional,
  email: textoOpcional,
  contato: textoOpcional,
  produtosFornecidos: textoOpcional,
  observacoes: textoOpcional,
});
export const fornecedorUpdate = parcial(fornecedorCreate);

const produtoBase = z.object({
  fornecedorId: idOpcional,
  sku: textoOpcional,
  nome: z.string().trim().min(1, 'Nome é obrigatório'),
  categoria: textoOpcional,
  unidade: z.string().trim().min(1).default('un'),
  precoCustoCentavos: centavos.default(0),
  precoVendaCentavos: centavos.default(0),
  estoqueMinimo: z.number().min(0).default(0),
  ativo: z.boolean().default(true),
  imagemId: imagemId.nullish(),
});
export const produtoCreate = produtoBase.extend({ estoqueAtual: z.number().min(0).default(0) });
// estoque só muda por entrada, ajuste ou venda, para manter o histórico
export const produtoUpdate = parcial(produtoBase);
export const produtoList = listQuery.extend({
  categoria: z.string().optional(),
  estoqueBaixo: z.stringbool().optional(),
  incluirInativos: z.stringbool().optional(),
});
export const entradaEstoque = z.object({
  quantidade: z.number().positive('Quantidade deve ser maior que zero'),
  custoUnitarioCentavos: centavos.optional(),
  motivo: textoOpcional,
});
export const ajusteEstoque = z.object({
  estoqueAtual: z.number().min(0),
  motivo: z.string().trim().min(1, 'Informe o motivo do ajuste'),
});

export const categoriasServico = ['ELETRICA', 'PELICULA', 'SOM', 'CHAVE', 'OUTROS'] as const;
export const servicoCreate = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório'),
  categoria: z.enum(categoriasServico, { error: 'Escolha a categoria' }).default('OUTROS'),
  descricao: textoOpcional,
  precoCentavos: centavos.default(0),
  tempoEstimadoMin: z.number().int().min(0).nullish(),
  ativo: z.boolean().default(true),
});
export const servicoUpdate = parcial(servicoCreate);
export const servicoList = listQuery.extend({ categoria: z.enum(categoriasServico).optional() });

export const procedimentoCreate = z.object({
  veiculoId: idOpcional,
  modeloVeiculo: z.string().trim().min(1, 'Modelo do veículo é obrigatório'),
  defeitoReclamado: z.string().trim().min(1, 'Defeito é obrigatório'),
  diagnosticoEncontrado: textoOpcional,
  solucaoAplicada: textoOpcional,
  esquemaEletricoAnotacoes: textoOpcional,
  tags: textoOpcional,
  // fotos na ordem em que aparecem, cada uma com legenda opcional
  imagens: z.array(z.object({ id: imagemId, legenda: textoOpcional })).max(30, 'No máximo 30 fotos').optional(),
});
export const procedimentoUpdate = parcial(procedimentoCreate);

export const estadosFerramenta = ['NOVA', 'BOA', 'MANUTENCAO', 'DESCARTADA'] as const;
export const ferramentaCreate = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório'),
  marca: textoOpcional,
  modelo: textoOpcional,
  categoria: textoOpcional,
  numeroSerie: textoOpcional,
  quantidade: z.number().int().min(1, 'Quantidade mínima é 1').default(1),
  valorCompraCentavos: centavos.default(0),
  dataCompra: dataLocal.nullish(),
  ondeComprou: textoOpcional,
  garantiaAte: dataLocal.nullish(),
  localizacao: textoOpcional,
  estado: z.enum(estadosFerramenta).default('BOA'),
  observacoes: textoOpcional,
  imagemId: imagemId.nullish(),
});
export const ferramentaUpdate = parcial(ferramentaCreate);
export const ferramentaList = listQuery.extend({
  categoria: z.string().optional(),
  incluirDescartadas: z.stringbool().optional(),
});

export const despesaCreate = z.object({
  descricao: z.string().trim().min(1, 'Descrição é obrigatória'),
  categoria: textoOpcional,
  valorCentavos: centavos.refine((v) => v > 0, 'Valor deve ser maior que zero'),
  data: dataLocal.optional(),
  pago: z.boolean().default(true),
});
export const despesaUpdate = parcial(despesaCreate);
export const despesaList = listQuery.extend({ de: dataLocal.optional(), ate: dataLocal.optional() });

export const empresaUpdate = z.object({
  nomeFantasia: z.string().trim().min(1).optional(),
  razaoSocial: textoOpcional,
  cnpj: textoOpcional.transform(somenteDigitos),
  telefone: textoOpcional,
  email: textoOpcional,
  cep: textoOpcional.transform(somenteDigitos),
  endereco: textoOpcional,
  numero: textoOpcional,
  bairro: textoOpcional,
  cidade: textoOpcional,
  uf: textoOpcional.transform((v) => v?.toUpperCase()),
  urlEmissorNfe: textoOpcional.refine((v) => v == null || /^https?:\/\//.test(v), 'Informe um link começando com http:// ou https://'),
});

export type VeiculoCreate = z.infer<typeof veiculoCreate>;
export type VeiculoUpdate = z.infer<typeof veiculoUpdate>;
export type FornecedorCreate = z.infer<typeof fornecedorCreate>;
export type FornecedorUpdate = z.infer<typeof fornecedorUpdate>;
export type ProdutoCreate = z.infer<typeof produtoCreate>;
export type ProdutoUpdate = z.infer<typeof produtoUpdate>;
export type ServicoCreate = z.infer<typeof servicoCreate>;
export type ServicoUpdate = z.infer<typeof servicoUpdate>;
export type ServicoList = z.infer<typeof servicoList>;
export type ProcedimentoCreate = z.infer<typeof procedimentoCreate>;
export type ProcedimentoUpdate = z.infer<typeof procedimentoUpdate>;
export type FerramentaCreate = z.infer<typeof ferramentaCreate>;
export type FerramentaUpdate = z.infer<typeof ferramentaUpdate>;
export type FerramentaList = z.infer<typeof ferramentaList>;
export type DespesaCreate = z.infer<typeof despesaCreate>;
export type DespesaUpdate = z.infer<typeof despesaUpdate>;

// Rádio do player: o link precisa ser http(s), de preferência o stream direto (.mp3, .aac, /stream…).
export const radioCreate = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório'),
  descricao: textoOpcional,
  url: z
    .string()
    .trim()
    .min(1, 'Link da transmissão é obrigatório')
    .refine((v) => /^https?:\/\/\S+$/i.test(v), 'Use um link que comece com http:// ou https://'),
  tocarAoAbrir: z.boolean().default(false),
});
export const radioUpdate = parcial(radioCreate);
export type RadioCreate = z.infer<typeof radioCreate>;
export type RadioUpdate = z.infer<typeof radioUpdate>;
