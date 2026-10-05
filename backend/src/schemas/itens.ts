import { z } from 'zod';

export const centavos = z.number().int('Valor deve estar em centavos').min(0);
export const quantidade = z.number().positive('Quantidade deve ser maior que zero');

const itemProduto = z.object({
  tipo: z.literal('PRODUTO'),
  produtoId: z.number().int().positive(),
  quantidade,
  // se omitido, usa o preço de venda atual do produto
  valorUnitarioCentavos: centavos.optional(),
  descricao: z.string().trim().min(1).optional(),
});

const itemServico = z
  .object({
    tipo: z.literal('SERVICO'),
    servicoId: z.number().int().positive().optional(),
    descricao: z.string().trim().min(1).optional(),
    quantidade: quantidade.default(1),
    valorUnitarioCentavos: centavos.optional(),
  })
  .refine((i) => i.servicoId != null || (i.descricao != null && i.valorUnitarioCentavos != null), {
    message: 'Serviço avulso precisa de descrição e valor',
  });

export const itemInput = z.discriminatedUnion('tipo', [itemProduto, itemServico]);
export const itensInput = z.array(itemInput).min(1, 'Inclua ao menos um item');

export type ItemInput = z.infer<typeof itemInput>;
