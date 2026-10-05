import { z } from 'zod';
import { parcial, somenteDigitos, textoOpcional } from './common.js';

export const clienteCreate = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório'),
  cpfCnpj: textoOpcional.transform(somenteDigitos).refine(
    (v) => v == null || v.length === 11 || v.length === 14,
    'CPF deve ter 11 dígitos e CNPJ 14',
  ),
  telefone: textoOpcional,
  email: z.email('E-mail inválido').nullish().or(z.literal('').transform(() => null)),
  cep: textoOpcional.transform(somenteDigitos),
  endereco: textoOpcional,
  numero: textoOpcional,
  complemento: textoOpcional,
  bairro: textoOpcional,
  cidade: textoOpcional,
  uf: textoOpcional.transform((v) => v?.toUpperCase()).refine((v) => v == null || v.length === 2, 'UF inválida'),
  observacoes: textoOpcional,
});

export const clienteUpdate = parcial(clienteCreate);

export type ClienteCreate = z.infer<typeof clienteCreate>;
export type ClienteUpdate = z.infer<typeof clienteUpdate>;
