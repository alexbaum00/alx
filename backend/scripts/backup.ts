// Gera uma cópia consistente do banco em backups/ (pode rodar com o sistema ligado).
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { prisma } from '../src/lib/prisma.js';

const pasta = resolve(import.meta.dirname, '..', '..', 'backups');
mkdirSync(pasta, { recursive: true });

const carimbo = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
const destino = resolve(pasta, `alx-${carimbo}.db`);

await prisma.$executeRawUnsafe(`VACUUM INTO '${destino.replace(/'/g, "''")}'`);
await prisma.$disconnect();
console.log(`Backup salvo em ${destino}`);
