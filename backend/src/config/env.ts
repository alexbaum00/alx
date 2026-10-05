import { z } from 'zod';

try {
  process.loadEnvFile();
} catch {
  // sem .env: usa as variáveis do ambiente e os padrões abaixo
}

const envSchema = z.object({
  DATABASE_URL: z.string().default('file:./alx.db'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3000),
  // define o que é "hoje" no painel, independente do fuso da máquina
  TZ: z.string().default('America/Sao_Paulo'),
});

export const env = envSchema.parse(process.env);
process.env.DATABASE_URL ??= env.DATABASE_URL;
process.env.TZ = env.TZ;
