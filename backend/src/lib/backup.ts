import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { env } from '../config/env.js';
import { prisma } from './prisma.js';
import { limparImagensOrfas, pastaImagens } from './imagens.js';

const PADRAO_NOME = /^alx-\d{8}-\d{6}(-\d+)?\.db$/;
const DIA_MS = 24 * 60 * 60 * 1000;

export const pastaBackup = () => resolve(env.BACKUP_DIR || resolve(import.meta.dirname, '..', '..', '..', 'backups'));

const doisDigitos = (n: number) => String(n).padStart(2, '0');
const carimbo = (d: Date) =>
  `${d.getFullYear()}${doisDigitos(d.getMonth() + 1)}${doisDigitos(d.getDate())}-${doisDigitos(d.getHours())}${doisDigitos(d.getMinutes())}${doisDigitos(d.getSeconds())}`;

export function listarBackups(pasta = pastaBackup()) {
  let arquivos: string[] = [];
  try {
    arquivos = readdirSync(pasta).filter((a) => PADRAO_NOME.test(a));
  } catch {
    return [];
  }
  return arquivos
    .map((arquivo) => {
      const info = statSync(resolve(pasta, arquivo));
      return { arquivo, tamanhoBytes: info.size, data: info.mtime };
    })
    .sort((a, b) => b.data.getTime() - a.data.getTime() || b.arquivo.localeCompare(a.arquivo));
}

// Cópia consistente com o sistema ligado (VACUUM INTO), depois apaga os mais antigos.
export async function fazerBackup(pasta = pastaBackup(), manter = env.BACKUP_MANTER) {
  mkdirSync(pasta, { recursive: true });
  const base = `alx-${carimbo(new Date())}`;
  let destino = resolve(pasta, `${base}.db`);
  // dois backups no mesmo segundo: alx-…-2.db (o SQLite não sobrescreve arquivo)
  for (let n = 2; existsSync(destino); n++) destino = resolve(pasta, `${base}-${n}.db`);
  await prisma.$executeRawUnsafe(`VACUUM INTO '${destino.replace(/'/g, "''")}'`);
  for (const antigo of listarBackups(pasta).slice(manter)) rmSync(resolve(pasta, antigo.arquivo), { force: true });
  copiarImagensNovas(resolve(pasta, 'imagens'));
  return destino;
}

// As fotos nunca mudam (nome aleatório), então basta copiar as que ainda não estão no backup.
// Fotos apagadas no sistema continuam no backup, por segurança.
export function copiarImagensNovas(destino: string, origem = pastaImagens()) {
  if (!existsSync(origem)) return 0;
  mkdirSync(destino, { recursive: true });
  let copiadas = 0;
  for (const arquivo of readdirSync(origem)) {
    const alvo = resolve(destino, arquivo);
    if (!existsSync(alvo)) {
      copyFileSync(resolve(origem, arquivo), alvo);
      copiadas++;
    }
  }
  return copiadas;
}

// De hora em hora: limpa fotos sem uso e faz backup se o último tem mais de 24 h (ou se não há nenhum).
export function agendarBackups(log: { info: (m: string) => void; error: (e: unknown) => void }) {
  const verificar = async () => {
    try {
      const removidas = await limparImagensOrfas();
      if (removidas) log.info(`${removidas} foto(s) sem uso apagada(s)`);
    } catch (e) {
      log.error(e);
    }
    const ultimo = listarBackups()[0];
    if (ultimo && Date.now() - ultimo.data.getTime() < DIA_MS) return;
    try {
      log.info(`Backup automático salvo em ${await fazerBackup()}`);
    } catch (e) {
      log.error(e);
    }
  };
  setTimeout(verificar, 30_000); // dá tempo do sistema subir
  return setInterval(verificar, 60 * 60 * 1000);
}
