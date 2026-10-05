import { z } from 'zod';

export const idParam = z.object({ id: z.coerce.number().int().positive() });

export const listQuery = z.object({
  busca: z.string().trim().optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
});

// Campos de texto opcionais: string vazia vira null para não gravar "" no banco.
export const textoOpcional = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullish();

export const somenteDigitos = (v: string | null | undefined) => (v ? v.replace(/\D/g, '') || null : v);
