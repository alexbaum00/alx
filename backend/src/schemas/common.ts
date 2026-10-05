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

// Versão para edição (PUT): todos os campos opcionais e SEM valores padrão.
// No Zod 4, .partial() manteria os .default() e um PUT parcial zeraria preços, desconto etc.
export function parcial<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  const shape = Object.fromEntries(
    Object.entries(schema.shape).map(([campo, tipo]) => [
      campo,
      ((tipo instanceof z.ZodDefault ? tipo.unwrap() : tipo) as z.ZodType).optional(),
    ]),
  );
  return z.object(shape) as unknown as ReturnType<z.ZodObject<T>['partial']>;
}

// "2026-10-01" vira meia-noite no fuso local (TZ), não em UTC — senão o dia "volta" 3 horas.
export const dataLocal = z.union([
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .transform((v) => {
      const [a, m, d] = v.split('-').map(Number);
      return new Date(a, m - 1, d);
    }),
  z.coerce.date(),
]);

export const periodoQuery = z.object({ de: dataLocal.optional(), ate: dataLocal.optional() });
