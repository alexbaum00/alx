import { resolve } from 'node:path';
import { z } from 'zod';

// backend/.env, achado pela posição deste arquivo (src/config ou dist/config),
// e não pela pasta de onde o comando foi rodado
try {
  process.loadEnvFile(resolve(import.meta.dirname, '..', '..', '.env'));
} catch {
  // sem .env: usa as variáveis do ambiente e os padrões abaixo
}

const envSchema = z.object({
  DATABASE_URL: z.string().default('file:./alx.db'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3000),
  // define o que é "hoje" no painel, independente do fuso da máquina
  TZ: z.string().default('America/Sao_Paulo'),
  // pasta dos backups automáticos (pode ser uma pasta sincronizada com o Google Drive)
  BACKUP_DIR: z.string().optional(),
  // pasta das fotos (procedimentos, produtos, ferramentas); padrão: imagens/ na raiz do projeto
  IMAGENS_DIR: z.string().optional(),
  BACKUP_MANTER: z.coerce.number().int().min(1).default(30),
  BACKUP_AUTOMATICO: z.stringbool().default(true),
});

export const env = envSchema.parse(process.env);
process.env.DATABASE_URL ??= env.DATABASE_URL;
process.env.TZ = env.TZ;
